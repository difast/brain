"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { DemoBadge, StatusBadge, timeAgo } from "@/components/ui";
import { useT } from "@/lib/i18n";

export default function RobotsPage() {
  const { t } = useT();
  const { data, error, loading } = usePoll(() => api.listRobots());
  const robots = data?.items ?? [];
  const online = robots.filter((r) => r.status === "online").length;

  return (
    <main className="container">
      <h1>{t("robots.title")}</h1>
      <p className="sub">{t("robots.sub")}</p>

      {error && (
        <div className="error-box">
          {t("common.cannotReach")} {error}
        </div>
      )}

      <div className="grid cards" style={{ marginBottom: 24 }}>
        <div className="panel">
          <h2>{t("robots.total")}</h2>
          <div className="stat">{robots.length}</div>
        </div>
        <div className="panel">
          <h2>{t("robots.online")}</h2>
          <div className="stat" style={{ color: "var(--online)" }}>
            {online}
          </div>
        </div>
        <div className="panel">
          <h2>{t("robots.types")}</h2>
          <div className="stat">
            {new Set(robots.map((r) => r.robot_type)).size}
          </div>
        </div>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>{t("robots.name")}</th>
              <th>{t("robots.type")}</th>
              <th>{t("common.status")}</th>
              <th>{t("robots.commands")}</th>
              <th>{t("robots.registered")}</th>
              <th>{t("common.actions")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {robots.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/robots/${r.id}`}>{r.name}</Link>{" "}
                  <DemoBadge meta={r.meta} />
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
                  <button
                    onClick={() =>
                      r.paused ? api.resumeRobot(r.id) : api.pauseRobot(r.id)
                    }
                    style={{
                      background: r.paused ? "var(--online)" : "transparent",
                      color: r.paused ? "#04121f" : "var(--error)",
                      border: "1px solid var(--border)",
                      padding: "4px 10px",
                    }}
                  >
                    {r.paused ? t("common.resume") : t("common.pause")}
                  </button>
                </td>
                <td>
                  <Link href={`/robots/${r.id}`}>{t("common.view")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && robots.length === 0 && (
          <div className="empty">{t("robots.empty")}</div>
        )}
      </div>
    </main>
  );
}
