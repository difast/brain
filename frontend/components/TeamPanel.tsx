"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, type Team, type UserRole } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { Spinner, timeAgo, timeUntil } from "@/components/ui";
import { useT } from "@/lib/i18n";

/**
 * Colleagues in the caller's organization: who is in it, who has been invited,
 * and — for an organization administrator — adding and removing people.
 *
 * A plain member sees the same list read-only, which is why the server sends
 * `can_manage` rather than the client inferring it from the role.
 */
export function TeamPanel({ currentUserId }: { currentUserId: string }) {
  const { t } = useT();
  const { toast, confirm } = useFeedback();

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Shown when mail is off or bounced: the administrator passes it on by hand.
  const [manualLink, setManualLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTeam(await api.getTeam());
    } catch (e) {
      toast(errorMessage(e, t("team.loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setManualLink(null);
    try {
      const created = await api.inviteMember(email.trim(), role);
      setEmail("");
      setRole("member");
      await load();
      if (created.emailed) {
        toast(t("team.invited"), "success");
      } else {
        // No mail configured — the link is the only way in, so surface it.
        setManualLink(created.link);
        toast(t("team.invitedNoMail"), "success");
      }
    } catch (err) {
      toast(errorMessage(err, t("team.inviteFailed")), "error");
    } finally {
      setInviting(false);
    }
  }

  async function revoke(id: string, address: string) {
    const ok = await confirm({
      title: t("team.revokeTitle"),
      body: `${t("team.revokeBody")} ${address}`,
      confirmLabel: t("team.revoke"),
      danger: true,
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await api.revokeInvite(id);
      await load();
      toast(t("team.revoked"), "success");
    } catch (err) {
      toast(errorMessage(err, t("team.revokeFailed")), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(id: string, next: UserRole) {
    setBusyId(id);
    try {
      await api.setMemberRole(id, next);
      await load();
      toast(t("team.roleChanged"), "success");
    } catch (err) {
      toast(errorMessage(err, t("team.roleFailed")), "error");
      await load(); // the select is uncontrolled-ish; resync it
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, address: string) {
    const ok = await confirm({
      title: t("team.removeTitle"),
      body: `${t("team.removeBody")} ${address}`,
      confirmLabel: t("team.remove"),
      danger: true,
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await api.removeMember(id);
      await load();
      toast(t("team.removed"), "success");
    } catch (err) {
      toast(errorMessage(err, t("team.removeFailed")), "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !team) {
    return (
      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("team.title")}</h2>
        <Spinner />
      </div>
    );
  }

  const manage = team.can_manage;

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h2>{t("team.title")}</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        {manage ? t("team.hint") : t("team.hintReadOnly")}
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t("team.member")}</th>
              <th>{t("team.role")}</th>
              <th>{t("team.joined")}</th>
              {manage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {team.members.map((m) => {
              const isMe = m.id === currentUserId;
              return (
                <tr key={m.id}>
                  <td>
                    {m.email}{" "}
                    {isMe && (
                      <span className="chip" style={{ marginLeft: 6 }}>
                        {t("team.you")}
                      </span>
                    )}
                  </td>
                  <td>
                    {manage ? (
                      <select
                        value={m.role}
                        disabled={busyId === m.id}
                        onChange={(e) =>
                          changeRole(m.id, e.target.value as UserRole)
                        }
                        style={{ padding: "4px 8px", fontSize: 13 }}
                      >
                        <option value="admin">{t("admin.roleAdmin")}</option>
                        <option value="member">{t("admin.roleMember")}</option>
                      </select>
                    ) : (
                      <span className="chip">
                        {m.role === "admin"
                          ? t("admin.roleAdmin")
                          : t("admin.roleMember")}
                      </span>
                    )}
                  </td>
                  <td className="muted">{timeAgo(m.created_at)}</td>
                  {manage && (
                    <td style={{ textAlign: "right" }}>
                      {/* Removing yourself is refused server-side; don't offer it. */}
                      {!isMe && (
                        <button
                          onClick={() => remove(m.id, m.email)}
                          disabled={busyId === m.id}
                          style={{
                            background: "transparent",
                            color: "var(--error)",
                            border: "1px solid var(--border)",
                            padding: "4px 10px",
                          }}
                        >
                          {t("team.remove")}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {manage && team.invites.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, marginTop: 20, marginBottom: 6 }}>
            {t("team.pending")}
          </h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("team.member")}</th>
                  <th>{t("team.role")}</th>
                  <th>{t("team.expires")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {team.invites.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>
                      <span className="chip">
                        {i.role === "admin"
                          ? t("admin.roleAdmin")
                          : t("admin.roleMember")}
                      </span>
                    </td>
                    <td className="muted">{timeUntil(i.expires_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => revoke(i.id, i.email)}
                        disabled={busyId === i.id}
                        style={{
                          background: "transparent",
                          color: "var(--error)",
                          border: "1px solid var(--border)",
                          padding: "4px 10px",
                        }}
                      >
                        {t("team.revoke")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {manage && (
        <form
          onSubmit={invite}
          className="row"
          style={{
            gap: 8,
            alignItems: "flex-end",
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <label htmlFor="team-email">{t("team.inviteEmail")}</label>
            <input
              id="team-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.ru"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label htmlFor="team-role">{t("team.role")}</label>
            <select
              id="team-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="member">{t("admin.roleMember")}</option>
              <option value="admin">{t("admin.roleAdmin")}</option>
            </select>
          </div>
          <button type="submit" disabled={inviting || !email.trim()}>
            {inviting ? <Spinner /> : t("team.invite")}
          </button>
        </form>
      )}

      {manualLink && (
        <div style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: "0 0 6px", fontSize: 13 }}>
            {t("team.manualLink")}
          </p>
          <pre
            className="mono"
            style={{
              margin: 0,
              padding: "10px 12px",
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
            }}
          >
            {manualLink}
          </pre>
        </div>
      )}
    </div>
  );
}
