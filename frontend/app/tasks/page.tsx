"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { timeAgo } from "@/components/ui";

export default function TasksPage() {
  const { data, error } = usePoll(() => api.listTasks());
  const robots = usePoll(() => api.listRobots(), 8000);
  const tasks = data?.items ?? [];
  const robotList = robots.data?.items ?? [];

  const [robotId, setRobotId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function assign() {
    if (!robotId || !description.trim()) {
      setFormError("Pick a robot and enter a description.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await api.createTask({ robot_id: robotId, description, priority });
      setDescription("");
      setPriority(0);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Task Engine</h1>
      <p className="sub">
        Assign tasks to robots top-down. Robots pull their next queued task
        (highest priority first) and report the result.
      </p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Assign a task</h2>
        {formError && <div className="error-box">{formError}</div>}
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label>Robot</label>
            <select
              value={robotId}
              onChange={(e) => setRobotId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">— select robot —</option>
              {robotList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.robot_type})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "2 1 320px" }}>
            <label>Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. bring the box from A to B"
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: "0 0 110px" }}>
            <label>Priority</label>
            <input
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <button onClick={assign} disabled={busy}>
            Assign
          </button>
        </div>
      </div>

      {error && <div className="error-box">Cannot reach API: {error}</div>}

      <div className="panel">
        <h2>Queue</h2>
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Description</th>
              <th>Robot</th>
              <th>Status</th>
              <th>Source</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.priority}</td>
                <td>{t.description}</td>
                <td>
                  <Link href={`/robots/${t.robot_id}`} className="mono">
                    {t.robot_id.slice(0, 8)}…
                  </Link>
                </td>
                <td>
                  <span className="chip">{t.status}</span>
                </td>
                <td className="muted">{t.source}</td>
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
