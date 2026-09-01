/**
 * Official JavaScript / TypeScript SDK for the Mevratek device-control API.
 *
 * Mirrors the Python client: register once, then heartbeat, send telemetry and
 * ask the brain for decisions. Uses the platform `fetch`, so it runs on Node 18+,
 * Deno, Bun and in the browser with no dependencies.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: unknown };

/** One low-level command the device knows how to execute. */
export interface Capability {
  type: string;
  value?: JsonObject;
  [key: string]: unknown;
}

/** A device as the platform knows it. */
export interface Robot {
  id: string;
  name: string;
  robot_type: string;
  status: string;
  paused: boolean;
  capabilities: Capability[];
  created_at: string;
  [key: string]: unknown;
}

/** One command the brain wants executed. */
export interface Action {
  action_id: string;
  type: string;
  value: Json;
  universal: Json;
  [key: string]: unknown;
}

export interface Decision {
  goal: string;
  thought?: string | null;
  confidence: number;
  actions: Action[];
  provider?: string | null;
  model?: string | null;
  latency_ms?: number | null;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  description: string;
  status: string;
  priority?: number;
  [key: string]: unknown;
}

/** Thrown when the API answers with a non-2xx status. */
export class BrainError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(`[${statusCode}] ${message}`);
    this.name = "BrainError";
    this.statusCode = statusCode;
    // Keep `instanceof` working when compiled down to ES5.
    Object.setPrototypeOf(this, BrainError.prototype);
  }
}

export interface ClientOptions {
  /** Abort a request after this many milliseconds. Default 30 000. */
  timeoutMs?: number;
  /** Swap in a custom fetch (tests, proxies, a polyfill on old runtimes). */
  fetch?: typeof globalThis.fetch;
}

export interface RegisterOptions extends ClientOptions {
  /**
   * An organization API key (`cbk_...`) issued from the dashboard: it says
   * which organization the new device belongs to. Registration swaps it for a
   * device token, so the key never has to live on the device.
   */
  apiKey: string;
  name: string;
  robotType: string;
  capabilities?: Capability[];
  meta?: JsonObject;
}

export interface DecideOptions {
  task: string;
  state?: JsonObject;
  /** A camera frame, already base64-encoded. */
  imageB64?: string;
  /** A camera frame as raw bytes — encoded for you. */
  imageBytes?: Uint8Array;
  imageMediaType?: string;
  frameUrl?: string;
  taskId?: string;
}

export interface TelemetryOptions {
  battery?: number;
  speed?: number;
  x?: number;
  y?: number;
  z?: number;
  errors?: Json[];
  extra?: JsonObject;
}

export interface ExecutionOptions {
  status?: "success" | "failed" | string;
  durationMs?: number;
  error?: string;
  decisionId?: string;
  actionType?: string;
}

function toBase64(bytes: Uint8Array): string {
  // Node has Buffer; browsers have btoa. Support both without a dependency.
  const maybeBuffer = (globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } })
    .Buffer;
  if (maybeBuffer) return maybeBuffer.from(bytes).toString("base64");

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * A thin, typed wrapper around the Mevratek API.
 *
 * Authenticate either by registering a new device (`BrainClient.register`) or
 * by constructing with a token you saved earlier.
 */
export class BrainClient {
  readonly baseUrl: string;
  token: string | null;
  /** Set by `register`; the device as the platform stored it. */
  robot?: Robot;
  /** Set by `register`; a long-lived key for server-to-server calls. */
  apiKey?: string;

  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(baseUrl: string, token: string | null = null, options: ClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    const f = options.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new TypeError(
        "No fetch available. Use Node 18+, or pass one as options.fetch.",
      );
    }
    this.fetchImpl = f.bind(globalThis);
  }

  // -- construction ----------------------------------------------------

  /** Register a new device and return an authenticated client. */
  static async register(baseUrl: string, options: RegisterOptions): Promise<BrainClient> {
    const { apiKey, name, robotType, capabilities, meta, ...clientOptions } = options;
    // The org key authenticates registration; the device token replaces it below.
    const client = new BrainClient(baseUrl, apiKey, clientOptions);
    const data = await client.request<{ token: string; robot: Robot; api_key: string }>(
      "POST",
      "/robots/register",
      {
        name,
        robot_type: robotType,
        capabilities: capabilities ?? [],
        meta: meta ?? {},
      },
    );
    client.token = data.token;
    client.robot = data.robot;
    client.apiKey = data.api_key;
    return client;
  }

  // -- device lifecycle ------------------------------------------------

  /** Report liveness. A device with no recent heartbeat reads as offline. */
  async heartbeat(status = "online"): Promise<JsonObject> {
    return this.request("POST", "/robots/heartbeat", { status });
  }

  /** Ask the brain what to do next. */
  async decide(options: DecideOptions): Promise<Decision> {
    const body: JsonObject = {
      task: options.task,
      state: options.state ?? {},
    };
    const imageB64 =
      options.imageB64 ?? (options.imageBytes ? toBase64(options.imageBytes) : undefined);
    if (imageB64) {
      body.image_b64 = imageB64;
      body.image_media_type = options.imageMediaType ?? "image/jpeg";
    }
    if (options.frameUrl) body.frame_url = options.frameUrl;
    if (options.taskId) body.task_id = options.taskId;
    return this.request<Decision>("POST", "/brain/decision", body);
  }

  /** Send a telemetry reading. Every field is optional. */
  async sendTelemetry(options: TelemetryOptions = {}): Promise<JsonObject> {
    return this.request("POST", "/telemetry", {
      battery: options.battery ?? null,
      speed: options.speed ?? null,
      x: options.x ?? null,
      y: options.y ?? null,
      z: options.z ?? null,
      errors: options.errors ?? [],
      extra: options.extra ?? {},
    });
  }

  // -- task engine -----------------------------------------------------

  /** Pull the next queued task for this device, or `null` when the queue is empty. */
  async nextTask(): Promise<Task | null> {
    const response = await this.send("GET", "/tasks/next");
    if (response.status === 204) return null;
    return this.handle<Task>(response);
  }

  async reportTaskResult(
    taskId: string,
    options: { status?: string; result?: string } = {},
  ): Promise<JsonObject> {
    return this.request("POST", `/tasks/${taskId}/result`, {
      status: options.status ?? "completed",
      result: options.result ?? null,
    });
  }

  // -- device abstraction layer ----------------------------------------

  /** Capabilities plus the universal actions the brain may use for this device. */
  async profile(robotId?: string): Promise<JsonObject> {
    const id = robotId ?? this.robot?.id;
    if (!id) throw new Error("No robot id: pass one, or use BrainClient.register.");
    return this.request("GET", `/robots/${id}/profile`);
  }

  /** Report how executing one action actually went (DAL feedback). */
  async reportExecution(actionId: string, options: ExecutionOptions = {}): Promise<JsonObject> {
    return this.request("POST", "/executions", {
      action_id: actionId,
      status: options.status ?? "success",
      duration_ms: options.durationMs ?? null,
      error: options.error ?? null,
      decision_id: options.decisionId ?? null,
      action_type: options.actionType ?? null,
    });
  }

  // -- internals -------------------------------------------------------

  private authHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  private async send(method: string, path: string, body?: JsonObject): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          ...this.authHeaders(),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async handle<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (response.ok) return (text ? JSON.parse(text) : {}) as T;

    let message = text;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* not JSON — the raw body is the best message we have */
    }
    throw new BrainError(response.status, message);
  }

  private async request<T = JsonObject>(
    method: string,
    path: string,
    body?: JsonObject,
  ): Promise<T> {
    return this.handle<T>(await this.send(method, path, body));
  }
}

export default BrainClient;
