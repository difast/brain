// Typed client for the Mevratek API.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

// --- Session token (dashboard auth) ---------------------------------------
// Stored in localStorage and attached as a Bearer token to every dashboard
// request. Device (robot) calls pass their own token explicitly, which
// overrides the session token.
const TOKEN_KEY = "mevratek.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — a no-op keeps the app rendering */
  }
}

function authHeaders(explicit?: string): Record<string, string> {
  const token = explicit ?? getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thrown on 401 so the UI can drop the session and redirect to /login. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type RobotStatus = "online" | "offline" | "error";

export interface CommandSpec {
  type: string;
  description?: string | null;
  value?: Record<string, unknown> | null;
}

export interface Robot {
  id: string;
  name: string;
  robot_type: string;
  status: RobotStatus;
  paused: boolean;
  capabilities: CommandSpec[];
  firmware_version: string | null;
  protocol_version: string;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DeviceProfile {
  robot_id: string;
  robot_type: string;
  protocol_version: string;
  firmware_version: string | null;
  capabilities: CommandSpec[];
  supported_commands: string[];
  supported_actions: { type: string; description: string }[];
}

export interface Execution {
  id: string;
  robot_id: string;
  decision_id: string | null;
  action_id: string;
  action_type: string | null;
  status: "success" | "failed";
  duration_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface Action {
  type: string;
  value: number | string | boolean | null;
}

export interface DeviceAction {
  action_id: string;
  type: string;
  value: number | string | boolean | null;
  universal: string | null;
}

export interface Decision {
  id: string;
  robot_id: string;
  task_id: string | null;
  goal: string;
  thought: string | null;
  confidence: number;
  actions: DeviceAction[];
  universal_actions: Action[];
  state: Record<string, unknown>;
  frame_url: string | null;
  model: string | null;
  provider: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  robot_id: string;
  description: string;
  status: string;
  priority: number;
  source: string;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface Telemetry {
  id: string;
  robot_id: string;
  battery: number | null;
  speed: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
  errors: unknown[];
  extra: Record<string, unknown>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type UserRole = "admin" | "member";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  organization: Organization;
}

function raiseForStatus(status: number, text: string): never {
  if (status === 401) throw new UnauthorizedError(text || "Unauthorized");
  throw new Error(text ? `${status}: ${text}` : `${status}`);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    post<AuthResponse>("/auth/login", { email, password }),
  logout: () => post<{ ok: boolean }>("/auth/logout", {}),
  me: () => get<AuthResponse>("/auth/me"),

  listRobots: () => get<Page<Robot>>("/robots?limit=200"),
  getRobot: (id: string) => get<Robot>(`/robots/${id}`),
  getProfile: (id: string) => get<DeviceProfile>(`/robots/${id}/profile`),
  listExecutions: (robotId?: string) =>
    get<Page<Execution>>(
      `/executions?limit=50${robotId ? `&robot_id=${robotId}` : ""}`,
    ),
  listLogs: (robotId?: string, opts?: { limit?: number; offset?: number }) =>
    get<Page<Decision>>(
      `/logs?limit=${opts?.limit ?? 100}&offset=${opts?.offset ?? 0}${
        robotId ? `&robot_id=${robotId}` : ""
      }`,
    ),
  listTasks: (robotId?: string, opts?: { limit?: number; offset?: number }) =>
    get<Page<Task>>(
      `/tasks?limit=${opts?.limit ?? 100}&offset=${opts?.offset ?? 0}${
        robotId ? `&robot_id=${robotId}` : ""
      }`,
    ),
  listTelemetry: (robotId?: string) =>
    get<Page<Telemetry>>(
      `/telemetry?limit=50${robotId ? `&robot_id=${robotId}` : ""}`,
    ),
  register: (body: {
    name: string;
    robot_type: string;
    capabilities: CommandSpec[];
  }) =>
    post<{ robot: Robot; api_key: string; token: string }>(
      "/robots/register",
      body,
    ),
  decision: (
    token: string,
    body: { task: string; state?: Record<string, unknown> },
  ) => post<Decision>("/brain/decision", body, token),
  heartbeat: (token: string) =>
    post<unknown>("/robots/heartbeat", { status: "online" }, token),

  pauseRobot: (id: string) => post<Robot>(`/robots/${id}/pause`, {}),
  resumeRobot: (id: string) => post<Robot>(`/robots/${id}/resume`, {}),
  renameRobot: (id: string, name: string) =>
    patch<Robot>(`/robots/${id}`, { name }),

  // Task Engine
  createTask: (body: {
    robot_id: string;
    description: string;
    priority: number;
  }) => post<Task>("/tasks", body),

  // API keys
  listApiKeys: () => get<ApiKey[]>("/api-keys"),
  createApiKey: (name: string) =>
    post<ApiKeyCreated>("/api-keys", { name }),
  revokeApiKey: (id: string) => del<ApiKey>(`/api-keys/${id}`),
};
