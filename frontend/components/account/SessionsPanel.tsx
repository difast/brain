"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { api, errorMessage, type UserSession } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { Spinner, timeAgo } from "@/components/ui";
import { Panel, deviceLabel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

export interface SessionsHandle {
  /** Reload the list — a password change signs other devices out. */
  reload: () => Promise<void>;
}

/**
 * Devices with a live session, so someone can spot one they do not recognise
 * and end it. The full User-Agent is on the row's title attribute, for when
 * the friendly label is not specific enough.
 */
export const SessionsPanel = forwardRef<SessionsHandle>(function SessionsPanel(
  _props,
  ref,
) {
  const { t } = useT();
  const { toast } = useFeedback();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await api.listSessions());
    } catch {
      /* the panel simply stays empty if this fails */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  async function revoke(id: string) {
    setBusy(id);
    try {
      await api.revokeSession(id);
      await load();
      toast(t("account.sessionRevoked"), "success");
    } catch (e) {
      toast(errorMessage(e, t("account.changeFailed")), "error");
    } finally {
      setBusy(null);
    }
  }

  async function revokeOthers() {
    setBusy("others");
    try {
      const res = await api.revokeOtherSessions();
      await load();
      toast(
        t("account.sessionsRevoked").replace(
          "{count}",
          String(res.sessions_closed),
        ),
        "success",
      );
    } catch (e) {
      toast(errorMessage(e, t("account.changeFailed")), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title={t("account.sessions")} hint={t("account.sessionsHint")}>
      {sessions.length > 1 && (
        <button
          type="button"
          onClick={revokeOthers}
          disabled={busy !== null}
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
            marginBottom: 12,
          }}
        >
          {busy === "others" ? <Spinner /> : t("account.revokeOthers")}
        </button>
      )}

      <div className="table-scroll">
        <table className="cards-table">
          <thead>
            <tr>
              <th>{t("account.sessionDevice")}</th>
              <th>{t("account.sessionIp")}</th>
              <th>{t("account.sessionStarted")}</th>
              <th>{t("account.sessionLastSeen")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td data-label={t("account.sessionDevice")}>
                  {/* The raw agent stays available on hover when the friendly
                      label is not enough to tell two devices apart. */}
                  <span title={s.user_agent ?? undefined}>
                    {deviceLabel(s.user_agent)}
                  </span>
                  {s.current && (
                    <span className="chip" style={{ marginLeft: 8 }}>
                      {t("account.sessionCurrent")}
                    </span>
                  )}
                </td>
                <td data-label={t("account.sessionIp")} className="mono muted">
                  {s.ip ?? "—"}
                </td>
                <td
                  data-label={t("account.sessionStarted")}
                  className="muted"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {timeAgo(s.created_at)}
                </td>
                <td
                  data-label={t("account.sessionLastSeen")}
                  className="muted"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {timeAgo(s.last_seen_at)}
                </td>
                <td data-label="">
                  {!s.current && (
                    <button
                      type="button"
                      onClick={() => revoke(s.id)}
                      disabled={busy !== null}
                      style={{
                        background: "transparent",
                        color: "var(--error)",
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                      }}
                    >
                      {t("account.revokeSession")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
});
