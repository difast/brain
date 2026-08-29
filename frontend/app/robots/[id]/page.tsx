"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { Actions, Confidence, DemoBadge, StatusBadge, timeAgo } from "@/components/ui";
import { useT } from "@/lib/i18n";

export default function RobotDetail({
  params,
}: {
  params: { id: string };
}) {
  const { t } = useT();
  const { id } = params;
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const robot = usePoll(() => api.getRobot(id), 5000);
  const profile = usePoll(() => api.getProfile(id), 8000);
  const logs = usePoll(() => api.listLogs(id), 4000);
  const tasks = usePoll(() => api.listTasks(id), 4000);
  const telemetry = usePoll(() => api.listTelemetry(id), 4000);
  const executions = usePoll(() => api.listExecutions(id), 4000);

  const r = robot.data;
  const prof = profile.data;
  const decisions = logs.data?.items ?? [];
  const robotTasks = tasks.data?.items ?? [];
  const readings = telemetry.data?.items ?? [];
  const execs = executions.data?.items ?? [];
  const latest = readings[0];
  const displayName = nameOverride ?? r?.name ?? "";

  async function saveName() {
    const name = draft.trim();
    if (!name) return;
    setRenaming(true);
    try {
      const updated = await api.renameRobot(id, name);
      setNameOverride(updated.name);
      setEditing(false);
    } finally {
      setRenaming(false);
    }
  }

  return (
    <main className="container">
      {robot.error && <div className="error-box">{t("rd.notFound")}</div>}
      {r && (
        <>
          <div className="row" style={{ alignItems: "center", gap: 14 }}>
            {editing ? (
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <input
                  autoFocus
                  value={draft}
                  maxLength={255}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  style={{ fontSize: 18, fontWeight: 700, padding: "7px 11px", minWidth: 240 }}
                />
                <button
                  onClick={saveName}
                  disabled={renaming || !draft.trim()}
                  style={{ padding: "7px 14px" }}
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={renaming}
                  style={{
                    background: "var(--panel-2)",
                    color: "var(--text)",
                    padding: "7px 14px",
                  }}
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <h1 style={{ margin: 0 }}>{displayName}</h1>
                <button
                  title={t("rd.rename")}
                  aria-label={t("rd.rename")}
                  onClick={() => {
                    setDraft(displayName);
                    setEditing(true);
                  }}
                  style={{
                    background: "transparent",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                    borderRadius: 7,
                    padding: "5px 9px",
                    lineHeight: 1,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path d="M13.5 8l2.5 2.5" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </div>
            )}
            <StatusBadge status={r.status} />
            <span className="chip">{r.robot_type}</span>
            <DemoBadge meta={r.meta} />
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (r.paused) await api.resumeRobot(r.id);
                  else await api.pauseRobot(r.id);
                } finally {
                  setBusy(false);
                }
              }}
              style={{
                marginLeft: "auto",
                background: r.paused ? "var(--online)" : "transparent",
                color: r.paused ? "#04121f" : "var(--error)",
                border: "1px solid var(--border)",
                padding: "6px 14px",
              }}
            >
              {r.paused ? t("common.resume") : t("common.pause")}
            </button>
          </div>
          <p className="sub mono">{r.id}</p>

          <div className="grid cards">
            <div className="panel">
              <h2>{t("rd.battery")}</h2>
              <div className="stat">
                {latest?.battery != null ? `${latest.battery}%` : "—"}
              </div>
            </div>
            <div className="panel">
              <h2>{t("rd.speed")}</h2>
              <div className="stat">
                {latest?.speed != null ? latest.speed : "—"}
              </div>
            </div>
            <div className="panel">
              <h2>{t("rd.position")}</h2>
              <div className="mono" style={{ fontSize: 16, marginTop: 8 }}>
                {latest
                  ? `x:${latest.x ?? 0} y:${latest.y ?? 0} z:${latest.z ?? 0}`
                  : "—"}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>{t("rd.profile")}</h2>
            <div className="row" style={{ gap: 24, marginBottom: 12 }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>{t("rd.fwType")}</div>
                <div className="mono">{r.robot_type}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>{t("rd.firmware")}</div>
                <div className="mono">{r.firmware_version ?? "—"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>{t("rd.protocol")}</div>
                <div className="mono">{r.protocol_version}</div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              {t("rd.lowLevel")}
            </div>
            <div style={{ marginBottom: 10 }}>
              {r.capabilities.length === 0 && (
                <span className="muted">{t("rd.noCommands")}</span>
              )}
              {r.capabilities.map((c) => (
                <span key={c.type} className="chip" title={c.description ?? ""}>
                  {c.type}
                </span>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              {t("rd.universal")}
            </div>
            <div>
              {(prof?.supported_actions ?? []).map((a) => (
                <span key={a.type} className="chip" title={a.description}>
                  {a.type}
                </span>
              ))}
              {prof && prof.supported_actions.length === 0 && (
                <span className="muted">{t("common.none")}</span>
              )}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>{t("rd.tasks")}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t("tasks.description")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("common.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {robotTasks.map((tk) => (
                  <tr key={tk.id}>
                    <td>{tk.description}</td>
                    <td>
                      <span className="chip">{tk.status}</span>
                    </td>
                    <td className="muted">{timeAgo(tk.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {robotTasks.length === 0 && (
              <div className="empty">{t("rd.tasksEmpty")}</div>
            )}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>{t("rd.decisions")}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t("common.when")}</th>
                  <th>{t("rd.goal")}</th>
                  <th>{t("logs.actions")}</th>
                  <th>{t("logs.confidence")}</th>
                  <th>{t("rd.frame")}</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {timeAgo(d.created_at)}
                    </td>
                    <td>
                      <div>{d.goal}</div>
                      {d.thought && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {d.thought}
                        </div>
                      )}
                    </td>
                    <td>
                      <Actions actions={d.actions} />
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <Confidence value={d.confidence} />
                    </td>
                    <td className="mono muted">{d.frame_url ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {decisions.length === 0 && (
              <div className="empty">{t("rd.decisionsEmpty")}</div>
            )}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>{t("rd.feedback")}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t("common.when")}</th>
                  <th>{t("rd.action")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("rd.duration")}</th>
                  <th>{t("rd.errorCol")}</th>
                </tr>
              </thead>
              <tbody>
                {execs.map((e) => (
                  <tr key={e.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {timeAgo(e.created_at)}
                    </td>
                    <td className="mono">
                      {e.action_type ?? e.action_id.slice(0, 8)}
                    </td>
                    <td>
                      <span
                        className={`badge ${e.status === "success" ? "online" : "error"}`}
                      >
                        <span className="dot" />
                        {t(`common.${e.status}`)}
                      </span>
                    </td>
                    <td className="mono muted">
                      {e.duration_ms != null ? `${e.duration_ms}ms` : "—"}
                    </td>
                    <td className="mono" style={{ color: "var(--error)" }}>
                      {e.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {execs.length === 0 && (
              <div className="empty">{t("rd.feedbackEmpty")}</div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
