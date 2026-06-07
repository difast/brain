"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { Actions, Confidence, timeAgo } from "@/components/ui";

export default function LogsPage() {
  const { data, error } = usePoll(() => api.listLogs());
  const logs = data?.items ?? [];

  return (
    <main className="container">
      <h1>Decision Logs</h1>
      <p className="sub">
        Every decision the brain has returned — the full audit trail of what
        Claude decided and why.
      </p>

      {error && <div className="error-box">Cannot reach API: {error}</div>}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Robot</th>
              <th>Goal / Thought</th>
              <th>Actions</th>
              <th>Confidence</th>
              <th>Model</th>
              <th>Latency</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((d) => (
              <tr key={d.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>
                  {timeAgo(d.created_at)}
                </td>
                <td>
                  <Link href={`/robots/${d.robot_id}`} className="mono">
                    {d.robot_id.slice(0, 8)}…
                  </Link>
                </td>
                <td style={{ maxWidth: 320 }}>
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
                <td>
                  <span className="chip">{d.model ?? "—"}</span>
                </td>
                <td className="mono muted">
                  {d.latency_ms != null ? `${d.latency_ms}ms` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="empty">No decisions yet.</div>}
      </div>
    </main>
  );
}
