"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api, type Robot } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { DemoBadge, StatusBadge, timeAgo } from "@/components/ui";
import { EmptyState, SkeletonRows, useFeedback } from "@/components/feedback";
import { Onboarding } from "@/components/Onboarding";
import { useT } from "@/lib/i18n";

type Sort = "recent" | "name" | "status";
const STATUS_ORDER: Record<string, number> = { online: 0, error: 1, offline: 2 };

export default function RobotsPage() {
  const { t } = useT();
  const { toast, confirm } = useFeedback();
  const { data, loading } = usePoll(() => api.listRobots());
  const robots = data?.items ?? [];
  const online = robots.filter((r) => r.status === "online").length;
  const errors = robots.filter((r) => r.status === "error").length;

  // Lightweight overview: decisions in the last 24h (recent window).
  const logs = usePoll(() => api.listLogs(undefined, { limit: 200 }), 15000);
  const decisions24h = useMemo(() => {
    const since = Date.now() - 86_400_000;
    return (logs.data?.items ?? []).filter(
      (d) => new Date(d.created_at).getTime() >= since,
    ).length;
  }, [logs.data]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sort, setSort] = useState<Sort>("recent");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = robots.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.robot_type.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle)
      );
    });
    list = [...list].sort((a: Robot, b: Robot) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "status")
        return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      return b.created_at.localeCompare(a.created_at); // recent
    });
    return list;
  }, [robots, q, statusFilter, sort]);

  async function togglePause(r: Robot) {
    if (!r.paused) {
      const ok = await confirm({
        title: t("confirm.pauseTitle"),
        body: t("confirm.pauseBody"),
        confirmLabel: t("confirm.stop"),
        danger: true,
      });
      if (!ok) return;
    }
    try {
      if (r.paused) await api.resumeRobot(r.id);
      else await api.pauseRobot(r.id);
      toast(r.paused ? t("toast.resumed") : t("toast.paused"));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    }
  }

  const chips: { value: string; label: string }[] = [
    { value: "", label: t("common.all") },
    { value: "online", label: t("common.online") },
    { value: "offline", label: t("common.offline") },
    { value: "error", label: t("common.error") },
  ];

  // First run: no devices yet. Show how to connect one instead of an empty
  // table with zeroes above it.
  if (!loading && robots.length === 0) {
    return (
      <main className="container">
        <h1>{t("robots.title")}</h1>
        <p className="sub">{t("robots.sub")}</p>
        <Onboarding />
      </main>
    );
  }

  return (
    <main className="container">
      <h1>{t("robots.title")}</h1>
      <p className="sub">{t("robots.sub")}</p>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">{t("robots.total")}</div>
          <div className="kpi-value">{robots.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("robots.online")}</div>
          <div className="kpi-value" style={{ color: "var(--online)" }}>
            {online}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("robots.errors")}</div>
          <div
            className="kpi-value"
            style={{ color: errors > 0 ? "var(--error)" : undefined }}
          >
            {errors}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("robots.decisions24h")}</div>
          <div className="kpi-value">{decisions24h}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`${t("common.search")}: ${t("robots.searchPlaceholder")}`}
          />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.value || "all"}
              className={`filter-chip${statusFilter === c.value ? " active" : ""}`}
              onClick={() => setStatusFilter(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label={t("common.sort")}
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="name">{t("sort.name")}</option>
          <option value="status">{t("sort.status")}</option>
        </select>
      </div>

      <div className="panel">
        <table className="cards-table">
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
            {loading && robots.length === 0 && <SkeletonRows cols={7} />}
            {shown.map((r) => (
              <tr key={r.id}>
                <td data-label={t("robots.name")}>
                  <span>
                    <Link href={`/robots/${r.id}`}>{r.name}</Link>{" "}
                    <DemoBadge meta={r.meta} />
                    <div className="mono muted">{r.id.slice(0, 12)}…</div>
                  </span>
                </td>
                <td data-label={t("robots.type")}>
                  <span className="chip">{r.robot_type}</span>
                </td>
                <td data-label={t("common.status")}>
                  <StatusBadge status={r.status} />
                </td>
                <td className="mono" data-label={t("robots.commands")}>
                  {r.capabilities.length}
                </td>
                <td className="muted" data-label={t("robots.registered")}>
                  {timeAgo(r.created_at)}
                </td>
                <td data-label={t("common.actions")}>
                  <button
                    onClick={() => togglePause(r)}
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
                <td data-label="">
                  <Link href={`/robots/${r.id}`}>{t("common.view")}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && robots.length > 0 && shown.length === 0 && (
          <EmptyState title={t("robots.nothing")} />
        )}
      </div>
    </main>
  );
}
