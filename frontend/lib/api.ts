// Typed client for the Cloud Brain API.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

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
  capabilities: CommandSpec[];
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Action {
  type: string;
  value: number | string | boolean | null;
}

export interface Decision {
  id: string;
  robot_id: string;
  task_id: string | null;
  goal: string;
  thought: string | null;
  confidence: number;
  actions: Action[];
  frame_url: string | null;
  model: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface Task {
  id: string;
  robot_id: string;
  description: string;
  status: string;
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

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listRobots: () => get<Page<Robot>>("/robots?limit=200"),
  getRobot: (id: string) => get<Robot>(`/robots/${id}`),
  listLogs: (robotId?: string) =>
    get<Page<Decision>>(
      `/logs?limit=100${robotId ? `&robot_id=${robotId}` : ""}`,
    ),
  listTasks: (robotId?: string) =>
    get<Page<Task>>(
      `/tasks?limit=100${robotId ? `&robot_id=${robotId}` : ""}`,
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
};
