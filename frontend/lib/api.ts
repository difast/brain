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
  newsletter_opt_in: boolean;
  alerts_opt_in: boolean;
  created_at: string;
}

export type AuditAction =
  | "login"
  | "login_failed"
  | "password_changed"
  | "password_reset"
  | "email_changed"
  | "avatar_changed"
  | "session_revoked";

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

// --- Metrics ---------------------------------------------------------------

export type MetricsWindow = "24h" | "7d" | "30d";

export interface SeriesPoint {
  start: string;
  decisions: number;
}

export interface MetricsSummary {
  window: string;
  since: string;
  decisions: number;
  fallback_decisions: number;
  /** Share of decisions the model did NOT make — the platform improvised. */
  fallback_rate: number;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  avg_confidence: number | null;
  sampled: boolean;
  executions: number;
  executions_failed: number;
  execution_success_rate: number | null;
  devices_total: number;
  devices_online: number;
  devices_error: number;
  devices_paused: number;
  tasks_queued: number;
  tasks_in_progress: number;
  tasks_completed: number;
  tasks_failed: number;
  series: SeriesPoint[];
}

export interface DeviceMetrics {
  robot_id: string;
  name: string;
  robot_type: string;
  paused: boolean;
  last_seen_at: string | null;
  decisions: number;
  avg_confidence: number | null;
  avg_latency_ms: number | null;
  failed_executions: number;
}

export interface ModelMetrics {
  provider: string | null;
  model: string | null;
  decisions: number;
  avg_latency_ms: number | null;
  avg_confidence: number | null;
  fallback: boolean;
}

export interface FailureRow {
  id: string;
  robot_id: string;
  robot_name: string;
  action_type: string | null;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

// --- Team (the caller's own organization) ---------------------------------

export interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Team {
  members: TeamMember[];
  invites: TeamInvite[];
  /** Whether the caller may change any of it (organization admins only). */
  can_manage: boolean;
}

export interface InviteCreated {
  invite: TeamInvite;
  /** Full redemption link, built server-side. */
  link: string;
  /** False when mail is off or delivery failed — pass the link on by hand. */
  emailed: boolean;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  created_at: string;
  member_count: number;
}

export interface UserSession {
  id: string;
  ip: string | null;
  user_agent: string | null;
  last_seen_at: string;
  created_at: string;
  current: boolean;
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

/**
 * Download an authenticated endpoint as a file. A plain link can't carry the
 * bearer token, so fetch it and hand the browser a blob.
 */
async function download(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!res.ok) raiseForStatus(res.status, await res.text());

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  setNewsletterOptIn: (newsletter_opt_in: boolean) =>
    patch<AuthUser>("/auth/newsletter", { newsletter_opt_in }),
  setAlertsOptIn: (alerts_opt_in: boolean) =>
    patch<AuthUser>("/auth/alerts", { alerts_opt_in }),
  exportLogs: (robotId?: string) =>
    download(
      `/logs/export.csv${robotId ? `?robot_id=${robotId}` : ""}`,
      "mevratek-decisions.csv",
    ),
  exportTelemetry: (robotId?: string) =>
    download(
      `/telemetry/export.csv${robotId ? `?robot_id=${robotId}` : ""}`,
      "mevratek-telemetry.csv",
    ),
  // Metrics
  metricsSummary: (window: MetricsWindow) =>
    get<MetricsSummary>(`/metrics/summary?window=${window}`),
  metricsDevices: (
    window: MetricsWindow,
    opts?: { limit?: number; offset?: number },
  ) =>
    get<Page<DeviceMetrics>>(
      `/metrics/devices?window=${window}&limit=${opts?.limit ?? 10}&offset=${
        opts?.offset ?? 0
      }`,
    ),
  metricsModels: (
    window: MetricsWindow,
    opts?: { limit?: number; offset?: number },
  ) =>
    get<Page<ModelMetrics>>(
      `/metrics/models?window=${window}&limit=${opts?.limit ?? 10}&offset=${
        opts?.offset ?? 0
      }`,
    ),
  metricsFailures: (
    window: MetricsWindow,
    opts?: { limit?: number; offset?: number },
  ) =>
    get<Page<FailureRow>>(
      `/metrics/failures?window=${window}&limit=${opts?.limit ?? 10}&offset=${
        opts?.offset ?? 0
      }`,
    ),

  // Team
  getOrganization: () => get<OrganizationDetail>("/organization"),
  getTeam: () => get<Team>("/organization/team"),
  inviteMember: (email: string, role: UserRole) =>
    post<InviteCreated>("/organization/team/invites", { email, role }),
  revokeInvite: (id: string) =>
    del<{ ok: boolean }>(`/organization/team/invites/${id}`),
  setMemberRole: (id: string, role: UserRole) =>
    patch<TeamMember>(`/organization/team/members/${id}`, { role }),
  removeMember: (id: string) =>
    del<{ ok: boolean }>(`/organization/team/members/${id}`),

  listSessions: () => get<UserSession[]>("/auth/sessions"),
  revokeSession: (id: string) => del<{ ok: boolean }>(`/auth/sessions/${id}`),
  revokeOtherSessions: () =>
    post<{ ok: boolean; sessions_closed: number }>(
      "/auth/sessions/revoke-others",
      {},
    ),
  requestPasswordReset: (email: string) =>
    post<CodeSentResponse>("/auth/password/reset/request", { email }),
  confirmPasswordReset: (email: string, code: string, new_password: string) =>
    post<{ ok: boolean }>("/auth/password/reset/confirm", {
      email,
      code,
      new_password,
    }),
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
