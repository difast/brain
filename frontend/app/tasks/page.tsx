"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { Pager, timeAgo } from "@/components/ui";
import { EmptyState, SkeletonRows } from "@/components/feedback";
import { useT } from "@/lib/i18n";

const PAGE = 25;

export default function TasksPage() {
  const { t } = useT();
  const [offset, setOffset] = useState(0);
  const { data, loading } = usePoll(
    () => api.listTasks(undefined, { limit: PAGE, offset }),
    4000,
    [offset],
  );
  const robots = usePoll(() => api.listRobots(), 8000);
  const tasks = data?.items ?? [];
  const total = data?.total ?? 0;
  const robotList = robots.data?.items ?? [];
  // The device list is already here for the assignment form; reuse it so the
  // queue names devices instead of showing a slice of a hash.
  const robotNames = new Map(robotList.map((r) => [r.id, r.name]));

  const [robotId, setRobotId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function assign() {
    if (!robotId || !description.trim()) {
      setFormError(t("tasks.pickError"));
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
      <h1>{t("tasks.title")}</h1>
      <p className="sub">{t("tasks.sub")}</p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("tasks.assign")}</h2>
        {formError && <div className="error-box">{formError}</div>}
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label>{t("tasks.robot")}</label>
            <select
              value={robotId}
              onChange={(e) => setRobotId(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">{t("tasks.selectRobot")}</option>
              {robotList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.robot_type})
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: "2 1 320px" }}>
            <label>{t("tasks.description")}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tasks.descPlaceholder")}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: "0 0 110px" }}>
            <label>{t("tasks.priority")}</label>
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
            {t("tasks.assignBtn")}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>{t("tasks.queue")}</h2>
        <div className="table-scroll">
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("tasks.priority")}</th>
                <th>{t("tasks.description")}</th>
                <th>{t("common.robot")}</th>
                <th>{t("common.status")}</th>
                <th>{t("tasks.source")}</th>
                <th>{t("common.updated")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && tasks.length === 0 && <SkeletonRows cols={6} />}
              {tasks.map((tk) => (
                <tr key={tk.id}>
                  <td className="mono" data-label={t("tasks.priority")}>
                    {tk.priority}
                  </td>
                  <td data-label={t("tasks.description")}>{tk.description}</td>
                  <td data-label={t("common.robot")}>
                    <Link href={`/robots/${tk.robot_id}`}>
                      {robotNames.get(tk.robot_id) ?? (
                        <span className="mono">{tk.robot_id.slice(0, 8)}…</span>
                      )}
                    </Link>
                  </td>
                  <td data-label={t("common.status")}>
                    <span className="chip">{tk.status}</span>
                  </td>
                  <td className="muted" data-label={t("tasks.source")}>
                    {tk.source}
                  </td>
                  <td className="muted" data-label={t("common.updated")}>
                    {timeAgo(tk.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && tasks.length === 0 && (
          <EmptyState title={t("tasks.empty")} />
        )}
        <Pager offset={offset} page={PAGE} total={total} onChange={setOffset} />
      </div>
    </main>
  );
}
