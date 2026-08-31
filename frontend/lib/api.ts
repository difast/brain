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

// --- Admin-panel token (separate from the user session) -------------------
const ADMIN_TOKEN_KEY = "mevratek.admin";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* storage unavailable — a no-op keeps the app rendering */
  }
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
  avatar: string | null;
  created_at: string;
}

export type AuditAction =
  | "login"
  | "login_failed"
  | "password_changed"
  | "email_changed"
  | "avatar_changed";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  ip: string | null;
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

/** Result of the password step: either a session, or "we emailed you a code". */
export interface LoginStartResponse {
  code_required: boolean;
  challenge: string | null;
  code_expires_in_seconds: number | null;
  masked_email: string | null;
  token: string | null;
  user: AuthUser | null;
  organization: Organization | null;
}

export interface CodeSentResponse {
  sent: boolean;
  expires_in_seconds: number;
  masked_email: string | null;
}

function raiseForStatus(status: number, text: string): never {
  if (status === 401) throw new UnauthorizedError(text || "Unauthorized");
  throw new Error(text ? `${status}: ${text}` : `${status}`);
}

/**
 * The human-readable message inside an API error. Error bodies are JSON
 * ({code, message, request_id}); show the message, not the envelope.
 */
export function errorMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const start = raw.indexOf("{");
  if (start >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(start));
      if (parsed && typeof parsed.message === "string" && parsed.message) {
        return parsed.message;
      }
    } catch {
      /* not JSON after all — fall through to the raw text */
    }
  }
  return raw || fallback;
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

// --- Admin panel + invites ------------------------------------------------

export interface AdminOrg {
  id: string;
  name: string;
  created_at: string;
}

export interface AdminInvite {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitePublic {
  email: string;
  organization_name: string;
  role: UserRole;
  valid: boolean;
}

export interface AdminLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  topic: string;
  message: string;
  created_at: string;
}

export type NewsletterStatus = "sending" | "sent" | "failed";

export interface AdminNewsletter {
  id: string;
  subject: string;
  body: string;
  status: NewsletterStatus;
  recipients: number;
  sent: number;
  failed: number;
  created_at: string;
}

async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: authHeaders(getAdminToken() ?? undefined),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());
  return res.json() as Promise<T>;
}

async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(getAdminToken() ?? undefined),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());
  return res.json() as Promise<T>;
}

async function adminDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(getAdminToken() ?? undefined),
  });
  if (!res.ok && res.status !== 204) raiseForStatus(res.status, await res.text());
}

export const adminApi = {
  login: (password: string) =>
    post<{ token: string }>("/admin/login", { password }),
  listOrgs: () => adminGet<AdminOrg[]>("/admin/organizations"),
  createOrg: (name: string) =>
    adminPost<AdminOrg>("/admin/organizations", { name }),
  deleteOrg: (id: string) => adminDelete(`/admin/organizations/${id}`),
  listUsers: () => adminGet<AuthUser[]>("/admin/users"),
  deleteUser: (id: string) => adminDelete(`/admin/users/${id}`),
  listInvites: () => adminGet<AdminInvite[]>("/admin/invites"),
  createInvite: (email: string, organization_id: string, role: UserRole) =>
    adminPost<AdminInvite>("/admin/invites", { email, organization_id, role }),
  deleteInvite: (id: string) => adminDelete(`/admin/invites/${id}`),
  listLeads: () => adminGet<AdminLead[]>("/admin/leads"),
  deleteLead: (id: string) => adminDelete(`/admin/leads/${id}`),
  listNewsletters: () => adminGet<AdminNewsletter[]>("/admin/newsletters"),
  createNewsletter: (subject: string, body: string) =>
    adminPost<AdminNewsletter>("/admin/newsletters", { subject, body }),
};

export const inviteApi = {
  get: (token: string) => get<InvitePublic>(`/invites/${token}`),
  accept: (token: string, password: string) =>
    post<AuthResponse>(`/invites/${token}/accept`, { password }),
};

export const api = {
  // Auth
  login: (email: string, password: string, captchaToken?: string | null) =>
    post<LoginStartResponse>("/auth/login", {
      email,
      password,
      captcha_token: captchaToken ?? undefined,
    }),
  loginVerify: (challenge: string, code: string) =>
    post<AuthResponse>("/auth/login/verify", { challenge, code }),
  config: () =>
    get<{ captcha_site_key: string; email_confirmation: boolean }>(
      "/auth/config",
    ),
  logout: () => post<{ ok: boolean }>("/auth/logout", {}),
  me: () => get<AuthResponse>("/auth/me"),
  requestPasswordCode: (current_password: string) =>
    post<CodeSentResponse>("/auth/password/request", { current_password }),
  changePassword: (
    current_password: string,
    new_password: string,
    code?: string,
  ) =>
    patch<{ ok: boolean }>("/auth/password", {
      current_password,
      new_password,
      code,
    }),
  requestEmailCode: (current_password: string, new_email: string) =>
    post<CodeSentResponse>("/auth/email/request", {
      current_password,
      new_email,
    }),
  changeEmail: (current_password: string, new_email: string, code?: string) =>
    patch<AuthUser>("/auth/email", { current_password, new_email, code }),
  updateAvatar: (avatar: string | null) =>
    patch<AuthUser>("/auth/avatar", { avatar }),
  listActivity: (params: { limit: number; offset: number }) =>
    get<Page<AuditLogEntry>>(
      `/auth/activity?limit=${params.limit}&offset=${params.offset}`,
    ),

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
