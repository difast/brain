"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { timeAgo } from "@/components/ui";

export default function TasksPage() {
  const { data, error } = usePoll(() => api.listTasks());
  const tasks = data?.items ?? [];

  return (
    <main className="container">
      <h1>Tasks</h1>
      <p className="sub">Tasks robots are working on, tracked by the brain.</p>

      {error && <div className="error-box">Cannot reach API: {error}</div>}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Robot</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.description}</td>
                <td>
                  <Link href={`/robots/${t.robot_id}`} className="mono">
                    {t.robot_id.slice(0, 8)}…
                  </Link>
                </td>
                <td>
                  <span className="chip">{t.status}</span>
                </td>
                <td className="muted">{timeAgo(t.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <div className="empty">No tasks yet.</div>}
      </div>
    </main>
  );
}
