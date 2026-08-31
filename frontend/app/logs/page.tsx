"use client";

import { useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import {
  Actions,
  Confidence,
  Pager,
  Sparkline,
  Spinner,
  timeAgo,
} from "@/components/ui";
import { EmptyState, SkeletonRows, useFeedback } from "@/components/feedback";
import { useT } from "@/lib/i18n";

const PAGE = 25;

export default function LogsPage() {
  const { t } = useT();
  const { toast } = useFeedback();
  const [offset, setOffset] = useState(0);
  const [deviceId, setDeviceId] = useState("");
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      // Exports exactly what the current filter shows.
      await api.exportLogs(deviceId || undefined);
    } catch (e) {
      toast(errorMessage(e, t("common.exportFailed")), "error");
    } finally {
      setExporting(false);
    }
  }

  const { data, loading } = usePoll(
    () => api.listLogs(deviceId || undefined, { limit: PAGE, offset }),
    4000,
    [offset, deviceId],
  );
  const robots = usePoll(() => api.listRobots(), 10000);
  const logs = data?.items ?? [];
  const total = data?.total ?? 0;
  const robotList = robots.data?.items ?? [];

  // Chronological (oldest→newest) series for the sparklines.
  const chrono = [...logs].reverse();
  const confSeries = chrono.map((d) => d.confidence * 100);
  const latSeries = chrono
    .filter((d) => d.latency_ms != null)
    .map((d) => d.latency_ms as number);

  return (
    <main className="container">
      <h1>{t("logs.title")}</h1>
      <p className="sub">{t("logs.sub")}</p>

      <div className="toolbar">
        <label className="row" style={{ gap: 8, alignItems: "center", margin: 0 }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {t("logs.device")}
          </span>
          <select
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">{t("logs.allDevices")}</option>
            {robotList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          {exporting ? <Spinner /> : t("common.exportCsv")}
        </button>

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
      </div>

      <div className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("common.when")}</th>
                <th>{t("common.robot")}</th>
                <th>{t("logs.goalThought")}</th>
                <th>{t("logs.actions")}</th>
                <th>{t("logs.confidence")}</th>
                <th>{t("logs.provider")}</th>
                <th>{t("logs.model")}</th>
                <th>{t("logs.latency")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 && <SkeletonRows cols={8} />}
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
                    <span className="chip">{d.provider ?? "—"}</span>
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
        </div>
        {!loading && logs.length === 0 && (
          <EmptyState title={t("logs.empty")} />
        )}
        <Pager offset={offset} page={PAGE} total={total} onChange={setOffset} />
      </div>
    </main>
  );
}
