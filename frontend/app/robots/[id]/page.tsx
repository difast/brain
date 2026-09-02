"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import {
  Actions,
  Confidence,
  DemoBadge,
  Pager,
  Sparkline,
  Spinner,
  StatusBadge,
  timeAgo,
} from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useT } from "@/lib/i18n";

const DECISIONS_PAGE = 10;

export default function RobotDetail({
  params,
}: {
  params: { id: string };
}) {
  const { t } = useT();
  const { toast, confirm } = useFeedback();
  const { id } = params;
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState<"" | "logs" | "telemetry">("");
  const robot = usePoll(() => api.getRobot(id), 5000);
  const profile = usePoll(() => api.getProfile(id), 8000);
  const logs = usePoll(
    () => api.listLogs(id, { limit: DECISIONS_PAGE, offset }),
    4000,
    [offset],
  );
  const tasks = usePoll(() => api.listTasks(id), 4000);
  const telemetry = usePoll(() => api.listTelemetry(id), 4000);
  const executions = usePoll(() => api.listExecutions(id), 4000);

  async function exportCsv(kind: "logs" | "telemetry") {
    setExporting(kind);
    try {
      if (kind === "logs") await api.exportLogs(id);
      else await api.exportTelemetry(id);
    } catch (e) {
      toast(errorMessage(e, t("common.exportFailed")), "error");
    } finally {
      setExporting("");
    }
  }

  const r = robot.data;
  const prof = profile.data;
  const decisions = logs.data?.items ?? [];
  const decisionsTotal = logs.data?.total ?? 0;
  const robotTasks = tasks.data?.items ?? [];
  const readings = telemetry.data?.items ?? [];
  const execs = executions.data?.items ?? [];
  const latest = readings[0];
  const displayName = nameOverride ?? r?.name ?? "";

  // Chronological (oldest→newest) series for the trend sparklines.
  const chrono = [...decisions].reverse();
  const confSeries = chrono.map((d) => d.confidence * 100);
  const latSeries = chrono
    .filter((d) => d.latency_ms != null)
    .map((d) => d.latency_ms as number);

  // Map a decision id to its goal, so execution feedback rows can link back
  // to the decision that produced them.
  const decisionGoalById = new Map(decisions.map((d) => [d.id, d.goal]));

  async function saveName() {
    const name = draft.trim();
    if (!name) return;
    setRenaming(true);
    try {
      const updated = await api.renameRobot(id, name);
      setNameOverride(updated.name);
      setEditing(false);
      toast(t("toast.renamed"));
    } finally {
      setRenaming(false);
    }
  }

  async function togglePause() {
    if (!r) return;
    if (!r.paused) {
      const ok = await confirm({
        title: t("confirm.pauseTitle"),
        body: t("confirm.pauseBody"),
        confirmLabel: t("confirm.stop"),
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      if (r.paused) await api.resumeRobot(r.id);
      else await api.pauseRobot(r.id);
      toast(r.paused ? t("toast.resumed") : t("toast.paused"));
    } finally {
      setBusy(false);
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
              onClick={togglePause}
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

          <div className="row" style={{ gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => exportCsv("logs")}
              disabled={exporting !== ""}
              style={{
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "6px 14px",
              }}
            >
              {exporting === "logs" ? <Spinner /> : t("rd.exportDecisions")}
            </button>
            <button
              type="button"
              onClick={() => exportCsv("telemetry")}
              disabled={exporting !== ""}
              style={{
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "6px 14px",
              }}
            >
              {exporting === "telemetry" ? <Spinner /> : t("rd.exportTelemetry")}
            </button>
          </div>

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
            <table className="cards-table">
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
                    <td data-label={t("tasks.description")}>{tk.description}</td>
                    <td data-label={t("common.status")}>
                      <span className="chip">{tk.status}</span>
                    </td>
                    <td className="muted" data-label={t("common.updated")}>
                      {timeAgo(tk.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {robotTasks.length === 0 && (
              <div className="empty">{t("rd.tasksEmpty")}</div>
            )}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <div
              className="row"
              style={{ alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}
            >
              <h2 style={{ margin: 0 }}>{t("rd.decisions")}</h2>
              {decisions.length >= 2 && (
                <div className="spark-cards">
                  <div className="spark-card">
                    <div className="spark-label">{t("logs.trendConfidence")}</div>
                    <Sparkline values={confSeries} color="var(--online)" />
                  </div>
                  <div className="spark-card">
                    <div className="spark-label">{t("logs.trendLatency")}</div>
                    <Sparkline values={latSeries} color="var(--accent)" />
                  </div>
                </div>
              )}
            </div>
            <table className="cards-table" style={{ marginTop: 12 }}>
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
                    <td
                      className="muted"
                      data-label={t("common.when")}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {timeAgo(d.created_at)}
                    </td>
                    <td data-label={t("rd.goal")}>
                      <div>{d.goal}</div>
                      {d.thought && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {d.thought}
                        </div>
                      )}
                    </td>
                    <td data-label={t("logs.actions")}>
                      <Actions actions={d.actions} />
                    </td>
                    <td data-label={t("logs.confidence")} style={{ minWidth: 110 }}>
                      <Confidence value={d.confidence} />
                    </td>
                    <td className="mono muted" data-label={t("rd.frame")}>
                      {d.frame_url ? "✓" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {decisions.length === 0 && (
              <div className="empty">{t("rd.decisionsEmpty")}</div>
            )}
            <Pager
              offset={offset}
              page={DECISIONS_PAGE}
              total={decisionsTotal}
              onChange={setOffset}
            />
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>{t("rd.feedback")}</h2>
            <table className="cards-table">
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
                    <td
                      className="muted"
                      data-label={t("common.when")}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {timeAgo(e.created_at)}
                    </td>
                    <td data-label={t("rd.action")}>
                      <div className="mono">
                        {e.action_type ?? e.action_id.slice(0, 8)}
                      </div>
                      {e.decision_id && decisionGoalById.has(e.decision_id) && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t("rd.forDecision")}: {decisionGoalById.get(e.decision_id)}
                        </div>
                      )}
                    </td>
                    <td data-label={t("common.status")}>
                      <span
                        className={`badge ${e.status === "success" ? "online" : "error"}`}
                      >
                        <span className="dot" />
                        {t(`common.${e.status}`)}
                      </span>
                    </td>
                    <td className="mono muted" data-label={t("rd.duration")}>
                      {e.duration_ms != null ? `${e.duration_ms}ms` : "—"}
                    </td>
                    <td
                      className="mono"
                      data-label={t("rd.errorCol")}
                      style={{ color: "var(--error)" }}
                    >
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
