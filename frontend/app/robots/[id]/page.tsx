"use client";

import { use } from "react";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { Actions, Confidence, StatusBadge, timeAgo } from "@/components/ui";

export default function RobotDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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

  return (
    <main className="container">
      {robot.error && (
        <div className="error-box">Robot not found or API unreachable.</div>
      )}
      {r && (
        <>
          <div className="row" style={{ alignItems: "center", gap: 14 }}>
            <h1 style={{ margin: 0 }}>{r.name}</h1>
            <StatusBadge status={r.status} />
            <span className="chip">{r.robot_type}</span>
          </div>
          <p className="sub mono">{r.id}</p>

          <div className="grid cards">
            <div className="panel">
              <h2>Battery</h2>
              <div className="stat">
                {latest?.battery != null ? `${latest.battery}%` : "—"}
              </div>
            </div>
            <div className="panel">
              <h2>Speed</h2>
              <div className="stat">
                {latest?.speed != null ? latest.speed : "—"}
              </div>
            </div>
            <div className="panel">
              <h2>Position</h2>
              <div className="mono" style={{ fontSize: 16, marginTop: 8 }}>
                {latest
                  ? `x:${latest.x ?? 0} y:${latest.y ?? 0} z:${latest.z ?? 0}`
                  : "—"}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>Device Profile</h2>
            <div className="row" style={{ gap: 24, marginBottom: 12 }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Type</div>
                <div className="mono">{r.robot_type}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Firmware</div>
                <div className="mono">{r.firmware_version ?? "—"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Protocol</div>
                <div className="mono">{r.protocol_version}</div>
              </div>
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Low-level commands (capabilities)
            </div>
            <div style={{ marginBottom: 10 }}>
              {r.capabilities.length === 0 && (
                <span className="muted">none registered</span>
              )}
              {r.capabilities.map((c) => (
                <span key={c.type} className="chip" title={c.description ?? ""}>
                  {c.type}
                </span>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Universal actions (what the brain may use, via the DAL)
            </div>
            <div>
              {(prof?.supported_actions ?? []).map((a) => (
                <span key={a.type} className="chip" title={a.description}>
                  {a.type}
                </span>
              ))}
              {prof && prof.supported_actions.length === 0 && (
                <span className="muted">none</span>
              )}
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>Tasks</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {robotTasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.description}</td>
                    <td>
                      <span className="chip">{t.status}</span>
                    </td>
                    <td className="muted">{timeAgo(t.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {robotTasks.length === 0 && (
              <div className="empty">No tasks yet for this robot.</div>
            )}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>Decision Logs</h2>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Goal</th>
                  <th>Actions</th>
                  <th>Confidence</th>
                  <th>Frame</th>
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
                    <td className="mono muted">
                      {d.frame_url ? "yes" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {decisions.length === 0 && (
              <div className="empty">No decisions yet for this robot.</div>
            )}
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h2>Execution Feedback</h2>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Error</th>
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
                        {e.status}
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
              <div className="empty">No execution feedback yet.</div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
