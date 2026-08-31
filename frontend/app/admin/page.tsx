"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  getAdminToken,
  setAdminToken,
  UnauthorizedError,
  type AdminInvite,
  type AdminLead,
  type AdminNewsletter,
  type AdminOrg,
  type AuthUser,
  type UserRole,
} from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner, timeAgo } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useT } from "@/lib/i18n";

function inviteLink(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(!!getAdminToken());
  }, []);

  if (!unlocked) return <AdminGate onUnlock={() => setUnlocked(true)} />;
  return <AdminPanel onLock={() => setUnlocked(false)} />;
}

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.login(password);
      setAdminToken(res.token);
      onUnlock();
    } catch {
      setError(t("admin.wrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          ◎ Mevra<span>tek</span>
        </div>
        <h1 className="login-title">{t("admin.title")}</h1>
        <p className="login-hint" style={{ marginTop: 0 }}>
          {t("admin.locked")}
        </p>

        {error && <div className="error-box">{error}</div>}

        <label htmlFor="admin-pw">{t("admin.password")}</label>
        <PasswordInput
          id="admin-pw"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          autoFocus
        />

        <button
          type="submit"
          className="login-submit"
          disabled={busy || !password}
        >
          {busy ? (
            <span className="btn-loading">
              <Spinner /> {t("admin.unlocking")}
            </span>
          ) : (
            t("admin.unlock")
          )}
        </button>
      </form>
    </main>
  );
}

function AdminPanel({ onLock }: { onLock: () => void }) {
  const { t } = useT();
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [newsletters, setNewsletters] = useState<AdminNewsletter[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const lock = useCallback(() => {
    setAdminToken(null);
    onLock();
  }, [onLock]);

  const reload = useCallback(async () => {
    try {
      const [o, u, i, l, n] = await Promise.all([
        adminApi.listOrgs(),
        adminApi.listUsers(),
        adminApi.listInvites(),
        adminApi.listLeads(),
        adminApi.listNewsletters(),
      ]);
      setOrgs(o);
      setUsers(u);
      setInvites(i);
      setLeads(l);
      setNewsletters(n);
      setLoadError(null);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        lock();
        return;
      }
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [lock]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <main className="container admin">
      <div className="admin-head">
        <div>
          <h1 style={{ margin: 0 }}>{t("admin.title")}</h1>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            ◎ Mevratek
          </p>
        </div>
        <button className="nav-logout" onClick={lock}>
          {t("admin.lock")}
        </button>
      </div>

      {loadError && <div className="error-box">{loadError}</div>}

      <LeadSection leads={leads} onChanged={reload} />
      <NewsletterSection
        newsletters={newsletters}
        userCount={users.length}
        onSent={reload}
      />
      <OrgSection orgs={orgs} onCreated={reload} />
      <InviteSection orgs={orgs} invites={invites} onCreated={reload} />
      <UserSection users={users} orgs={orgs} onChanged={reload} />
    </main>
  );
}

const TOPIC_LABELS: Record<string, string> = {
  pilot: "Пилотный проект",
  partnership: "Партнёрство",
  press: "Пресса",
  other: "Другое",
};

function LeadSection({
  leads,
  onChanged,
}: {
  leads: AdminLead[];
  onChanged: () => void;
}) {
  const { t } = useT();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(lead: AdminLead) {
    if (!window.confirm(t("admin.leadDeleteConfirm"))) return;
    setBusyId(lead.id);
    try {
      await adminApi.deleteLead(lead.id);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>
        {t("admin.leads")}
        {leads.length > 0 && (
          <span className="lead-count">{leads.length}</span>
        )}
      </h2>
      {leads.length === 0 ? (
        <div className="empty">{t("admin.noLeads")}</div>
      ) : (
        <div className="table-scroll">
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("admin.leadWhen")}</th>
                <th>{t("admin.leadContact")}</th>
                <th>{t("admin.leadTopic")}</th>
                <th>{t("admin.leadMessage")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td data-label={t("admin.leadWhen")} className="muted" style={{ whiteSpace: "nowrap" }}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td data-label={t("admin.leadContact")}>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    <div>
                      <a href={`mailto:${l.email}`} className="mono">
                        {l.email}
                      </a>
                    </div>
                    {l.phone && (
                      <div>
                        <a href={`tel:${l.phone}`} className="mono">
                          {l.phone}
                        </a>
                      </div>
                    )}
                    {l.organization && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {l.organization}
                      </div>
                    )}
                  </td>
                  <td data-label={t("admin.leadTopic")}>
                    <span className="chip">
                      {TOPIC_LABELS[l.topic] ?? l.topic}
                    </span>
                  </td>
                  <td data-label={t("admin.leadMessage")} style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>
                    {l.message}
                  </td>
                  <td data-label="">
                    <button
                      onClick={() => remove(l)}
                      disabled={busyId === l.id}
                      style={{
                        background: "transparent",
                        color: "var(--error)",
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                      }}
                    >
                      {t("admin.leadDelete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const NEWSLETTER_STATUS_KEYS: Record<string, string> = {
  sending: "admin.nlSending",
  sent: "admin.nlSent",
  failed: "admin.nlFailed",
};

function NewsletterSection({
  newsletters,
  userCount,
  onSent,
}: {
  newsletters: AdminNewsletter[];
  userCount: number;
  onSent: () => void;
}) {
  const { t } = useT();
  const { confirm, toast } = useFeedback();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    const ok = await confirm({
      title: t("admin.nlConfirmTitle"),
      body: t("admin.nlConfirmBody").replace("{count}", String(userCount)),
      confirmLabel: t("admin.nlSend"),
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.createNewsletter(subject.trim(), body.trim());
      setSubject("");
      setBody("");
      toast(t("admin.nlQueued"), "success");
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>{t("admin.newsletter")}</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        {t("admin.nlHint").replace("{count}", String(userCount))}
      </p>

      {error && <div className="error-box">{error}</div>}

      <label>{t("admin.nlSubject")}</label>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={t("admin.nlSubjectPlaceholder")}
        style={{ width: "100%", maxWidth: 520 }}
      />

      <label>{t("admin.nlBody")}</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={6}
        placeholder={t("admin.nlBodyPlaceholder")}
        style={{ width: "100%", maxWidth: 520, resize: "vertical" }}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={send} disabled={busy || !subject.trim() || !body.trim()}>
          {busy ? <Spinner /> : t("admin.nlSend")}
        </button>
      </div>

      {newsletters.length > 0 && (
        <div className="table-scroll" style={{ marginTop: 16 }}>
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("admin.colCreated")}</th>
                <th>{t("admin.nlSubject")}</th>
                <th>{t("admin.colStatus")}</th>
                <th>{t("admin.nlDelivered")}</th>
              </tr>
            </thead>
            <tbody>
              {newsletters.map((n) => (
                <tr key={n.id}>
                  <td data-label={t("admin.colCreated")} className="muted" style={{ whiteSpace: "nowrap" }}>
                    {timeAgo(n.created_at)}
                  </td>
                  <td data-label={t("admin.nlSubject")}>{n.subject}</td>
                  <td data-label={t("admin.colStatus")}>
                    <span className="chip">
                      {t(NEWSLETTER_STATUS_KEYS[n.status] ?? n.status)}
                    </span>
                  </td>
                  <td data-label={t("admin.nlDelivered")} className="mono muted">
                    {n.sent}/{n.recipients}
                    {n.failed > 0 ? ` · ${t("admin.nlFailedCount")}: ${n.failed}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrgSection({
  orgs,
  onCreated,
}: {
  orgs: AdminOrg[];
  onCreated: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await adminApi.createOrg(name.trim());
      setName("");
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  async function remove(org: AdminOrg) {
    if (!window.confirm(t("admin.orgDeleteConfirm").replace("{name}", org.name)))
      return;
    setBusyId(org.id);
    setError(null);
    try {
      await adminApi.deleteOrg(org.id);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>{t("admin.orgs")}</h2>
      <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
        <div style={{ flex: "1 1 260px" }}>
          <label>{t("admin.orgName")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ООО «Клиент»"
            style={{ width: "100%" }}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>
        <button onClick={create} disabled={busy || !name.trim()}>
          {busy ? <Spinner /> : t("admin.createOrg")}
        </button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {orgs.length === 0 ? (
        <div className="empty">{t("admin.noOrgs")}</div>
      ) : (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>{t("admin.colOrg")}</th>
              <th>{t("admin.colCreated")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td className="muted">{timeAgo(o.created_at)}</td>
                <td>
                  <button
                    onClick={() => remove(o)}
                    disabled={busyId === o.id}
                    style={{
                      background: "transparent",
                      color: "var(--error)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                    }}
                  >
                    {t("admin.orgDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function InviteSection({
  orgs,
  invites,
  onCreated,
}: {
  orgs: AdminOrg[];
  invites: AdminInvite[];
  onCreated: () => void;
}) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [orgId, setOrgId] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  async function create() {
    if (!email.trim() || !orgId) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const inv = await adminApi.createInvite(email.trim(), orgId, role);
      setLastLink(inviteLink(inv.token));
      setEmail("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(inv: AdminInvite) {
    if (!window.confirm(t("admin.inviteDeleteConfirm"))) return;
    setBusyId(inv.id);
    try {
      await adminApi.deleteInvite(inv.id);
      onCreated();
    } finally {
      setBusyId(null);
    }
  }

  async function copy() {
    if (!lastLink) return;
    try {
      await navigator.clipboard.writeText(lastLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the link is visible for manual copy */
    }
  }

  function status(inv: AdminInvite): string {
    if (inv.accepted_at) return t("admin.accepted");
    if (new Date(inv.expires_at).getTime() < Date.now())
      return t("admin.expired");
    return t("admin.pending");
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>{t("admin.newInvite")}</h2>
      {error && <div className="error-box">{error}</div>}
      <div className="row" style={{ alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 240px" }}>
          <label>{t("admin.inviteEmail")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.ru"
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ flex: "1 1 180px" }}>
          <label>{t("admin.inviteOrg")}</label>
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ width: "100%" }}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label>{t("admin.inviteRole")}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            style={{ width: "100%" }}
          >
            <option value="member">{t("admin.roleMember")}</option>
            <option value="admin">{t("admin.roleAdmin")}</option>
          </select>
        </div>
        <button onClick={create} disabled={busy || !email.trim() || !orgId}>
          {busy ? <Spinner /> : t("admin.createInvite")}
        </button>
      </div>

      {lastLink && (
        <div className="invite-link-box">
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            {t("admin.inviteLink")}
          </div>
          <div className="invite-link-row">
            <code className="invite-link">{lastLink}</code>
            <button className="nav-logout" onClick={copy}>
              {copied ? t("admin.copied") : t("admin.copy")}
            </button>
          </div>
        </div>
      )}

      <h2 style={{ marginTop: 20 }}>{t("admin.invites")}</h2>
      {invites.length === 0 ? (
        <div className="empty">{t("admin.noInvites")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("admin.colEmail")}</th>
              <th>{t("admin.colOrg")}</th>
              <th>{t("admin.colRole")}</th>
              <th>{t("admin.colStatus")}</th>
              <th>{t("admin.colExpires")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.email}</td>
                <td>{inv.organization_name}</td>
                <td>
                  <span className="chip">{inv.role}</span>
                </td>
                <td>{status(inv)}</td>
                <td className="muted">
                  {new Date(inv.expires_at).toLocaleString()}
                </td>
                <td>
                  <button
                    onClick={() => remove(inv)}
                    disabled={busyId === inv.id}
                    style={{
                      background: "transparent",
                      color: "var(--error)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                    }}
                  >
                    {t("admin.inviteDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UserSection({
  users,
  orgs,
  onChanged,
}: {
  users: AuthUser[];
  orgs: AdminOrg[];
  onChanged: () => void;
}) {
  const { t } = useT();
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id;
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(u: AuthUser) {
    if (!window.confirm(t("admin.userDeleteConfirm").replace("{email}", u.email)))
      return;
    setBusyId(u.id);
    try {
      await adminApi.deleteUser(u.id);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>{t("admin.users")}</h2>
      {users.length === 0 ? (
        <div className="empty">{t("admin.noUsers")}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t("admin.colEmail")}</th>
              <th>{t("admin.colOrg")}</th>
              <th>{t("admin.colRole")}</th>
              <th>{t("admin.colCreated")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{orgName(u.organization_id)}</td>
                <td>
                  <span className="chip">{u.role}</span>
                </td>
                <td className="muted">{timeAgo(u.created_at)}</td>
                <td>
                  <button
                    onClick={() => remove(u)}
                    disabled={busyId === u.id}
                    style={{
                      background: "transparent",
                      color: "var(--error)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                    }}
                  >
                    {t("admin.userDelete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
