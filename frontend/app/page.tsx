"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { StatusBadge, timeAgo } from "@/components/ui";

export default function RobotsPage() {
  const { data, error, loading } = usePoll(() => api.listRobots());
  const robots = data?.items ?? [];
  const online = robots.filter((r) => r.status === "online").length;

  return (
    <main className="container">
      <h1>Robot Fleet</h1>
      <p className="sub">
        Connected robots and their live status. Decisions are made in the cloud.
      </p>

      {error && <div className="error-box">Cannot reach API: {error}</div>}

      <div className="grid cards" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h2>Total robots</h2>
          <div className="stat">{robots.length}</div>
        </div>
        <div className="panel">
          <h2>Online</h2>
          <div className="stat" style={{ color: "var(--online)" }}>
            {online}
          </div>
        </div>
        <div className="panel">
          <h2>Types</h2>
          <div className="stat">
            {new Set(robots.map((r) => r.robot_type)).size}
          </div>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Commands</th>
              <th>Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {robots.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/robots/${r.id}`}>{r.name}</Link>
                  <div className="mono muted">{r.id.slice(0, 12)}…</div>
                </td>
                <td>
                  <span className="chip">{r.robot_type}</span>
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="mono">{r.capabilities.length}</td>
                <td className="muted">{timeAgo(r.created_at)}</td>
                <td>
                  <Link href={`/robots/${r.id}`}>view →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && robots.length === 0 && (
          <div className="empty">
            No robots yet. Open the <Link href="/simulator">Simulator</Link> to
            register one and request a decision.
          </div>
        )}
      </div>
    </main>
  );
}
