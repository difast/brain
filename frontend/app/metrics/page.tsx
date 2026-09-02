"use client";

import { useState } from "react";
import Link from "next/link";
import {
  api,
  type MetricsWindow,
} from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { Confidence, Pager, Sparkline, StatusBadge, timeAgo } from "@/components/ui";
import { EmptyState, SkeletonRows } from "@/components/feedback";
import { useT } from "@/lib/i18n";

const PAGE = 10;
const WINDOWS: MetricsWindow[] = ["24h", "7d", "30d"];

/** A number, or an em dash when there is nothing to show. */
function num(value: number | null | undefined, suffix = ""): string {
  return value == null ? "—" : `${value}${suffix}`;
}

function percent(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

export default function MetricsPage() {
  const { t } = useT();
  const [window, setWindow] = useState<MetricsWindow>("24h");

  // Independent offsets: paging one table must not reset the others.
  const [deviceOffset, setDeviceOffset] = useState(0);
  const [modelOffset, setModelOffset] = useState(0);
  const [failureOffset, setFailureOffset] = useState(0);

  const summary = usePoll(() => api.metricsSummary(window), 15000, [window]);
  const devices = usePoll(
    () => api.metricsDevices(window, { limit: PAGE, offset: deviceOffset }),
    20000,
    [window, deviceOffset],
  );
  const models = usePoll(
    () => api.metricsModels(window, { limit: PAGE, offset: modelOffset }),
    20000,
    [window, modelOffset],
  );
  const failures = usePoll(
    () => api.metricsFailures(window, { limit: PAGE, offset: failureOffset }),
    20000,
    [window, failureOffset],
  );

  const s = summary.data;
  const series = (s?.series ?? []).map((p) => p.decisions);

  // The headline risk: decisions the model did not actually make.
  const fallbackShare = s ? s.fallback_rate : 0;
  const fallbackAlarming = fallbackShare > 0;

  function changeWindow(next: MetricsWindow) {
    setWindow(next);
    setDeviceOffset(0);
    setModelOffset(0);
    setFailureOffset(0);
  }

  return (
    <main className="container">
      <h1>{t("metrics.title")}</h1>
      <p className="sub">{t("metrics.sub")}</p>

      <div className="toolbar">
        <div className="chips">
          {WINDOWS.map((w) => (
            <button
              key={w}
              className={`filter-chip${window === w ? " active" : ""}`}
              onClick={() => changeWindow(w)}
            >
              {t(`metrics.window.${w}`)}
            </button>
          ))}
        </div>
        {s?.sampled && (
          <span className="muted" style={{ fontSize: 12 }}>
            {t("metrics.sampled")}
          </span>
        )}
      </div>

      {/* Brain health — the reason this page exists. */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">{t("metrics.decisions")}</div>
          <div className="kpi-value">{num(s?.decisions)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.fallback")}</div>
          <div
            className="kpi-value"
            style={{ color: fallbackAlarming ? "var(--error)" : "var(--online)" }}
          >
            {percent(s?.fallback_rate)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.latencyP50")}</div>
          <div className="kpi-value">{num(s?.latency_p50_ms, " ms")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.latencyP95")}</div>
          <div className="kpi-value">{num(s?.latency_p95_ms, " ms")}</div>
        </div>
      </div>

      {fallbackAlarming && (
        <div className="error-box" style={{ marginTop: 12 }}>
          <strong>{t("metrics.fallbackWarnTitle")}</strong>{" "}
          {t("metrics.fallbackWarnBody")}{" "}
          <Link href="/logs">{t("nav.logs")}</Link>
        </div>
      )}

      <div className="kpi-strip" style={{ marginTop: 12 }}>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.confidence")}</div>
          <div className="kpi-value">
            {s?.avg_confidence == null
              ? "—"
              : `${Math.round(s.avg_confidence * 100)}%`}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.execSuccess")}</div>
          <div
            className="kpi-value"
            style={{
              color:
                s?.execution_success_rate != null && s.execution_success_rate < 0.9
                  ? "var(--error)"
                  : undefined,
            }}
          >
            {percent(s?.execution_success_rate)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.devicesOnline")}</div>
          <div className="kpi-value">
            {num(s?.devices_online)}
            <span className="muted" style={{ fontSize: 14 }}>
              {" "}
              / {num(s?.devices_total)}
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t("metrics.devicesError")}</div>
          <div
            className="kpi-value"
            style={{ color: (s?.devices_error ?? 0) > 0 ? "var(--error)" : undefined }}
          >
            {num(s?.devices_error)}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>{t("metrics.volume")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t(window === "24h" ? "metrics.volumeHourly" : "metrics.volumeDaily")}
        </p>
        <Sparkline values={series} color="var(--accent)" />
      </div>

      {/* Tasks */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>{t("metrics.tasks")}</h2>
        <div className="kpi-strip" style={{ marginTop: 4 }}>
          <div className="kpi">
            <div className="kpi-label">{t("metrics.tasksQueued")}</div>
            <div className="kpi-value">{num(s?.tasks_queued)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">{t("metrics.tasksRunning")}</div>
            <div className="kpi-value">{num(s?.tasks_in_progress)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">{t("metrics.tasksDone")}</div>
            <div className="kpi-value">{num(s?.tasks_completed)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">{t("metrics.tasksFailed")}</div>
            <div
              className="kpi-value"
              style={{ color: (s?.tasks_failed ?? 0) > 0 ? "var(--error)" : undefined }}
            >
              {num(s?.tasks_failed)}
            </div>
          </div>
        </div>
      </div>

      {/* Per-device */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>{t("metrics.byDevice")}</h2>
        <div className="table-scroll">
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("common.robot")}</th>
                <th>{t("common.status")}</th>
                <th>{t("metrics.decisions")}</th>
                <th>{t("logs.confidence")}</th>
                <th>{t("metrics.avgLatency")}</th>
                <th>{t("metrics.failures")}</th>
                <th>{t("metrics.lastSeen")}</th>
              </tr>
            </thead>
            <tbody>
              {devices.loading && !devices.data && <SkeletonRows cols={7} />}
              {(devices.data?.items ?? []).map((d) => (
                <tr key={d.robot_id}>
                  <td data-label={t("common.robot")}>
                    <Link href={`/robots/${d.robot_id}`}>{d.name}</Link>
                    <div className="mono muted">{d.robot_type}</div>
                  </td>
                  <td data-label={t("common.status")}>
                    <StatusBadge
                      status={
                        d.paused
                          ? "offline"
                          : d.last_seen_at
                            ? "online"
                            : "offline"
                      }
                    />
                  </td>
                  <td className="mono" data-label={t("metrics.decisions")}>
                    {d.decisions}
                  </td>
                  <td data-label={t("logs.confidence")} style={{ minWidth: 110 }}>
                    {d.avg_confidence == null ? (
                      "—"
                    ) : (
                      <Confidence value={d.avg_confidence} />
                    )}
                  </td>
                  <td className="mono muted" data-label={t("metrics.avgLatency")}>
                    {num(d.avg_latency_ms, "ms")}
                  </td>
                  <td
                    className="mono"
                    data-label={t("metrics.failures")}
                    style={{ color: d.failed_executions > 0 ? "var(--error)" : undefined }}
                  >
                    {d.failed_executions}
                  </td>
                  <td className="muted" data-label={t("metrics.lastSeen")}>
                    {d.last_seen_at ? timeAgo(d.last_seen_at) : t("common.never")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!devices.loading && (devices.data?.total ?? 0) === 0 && (
          <EmptyState title={t("metrics.noDevices")} />
        )}
        <Pager
          offset={deviceOffset}
          page={PAGE}
          total={devices.data?.total ?? 0}
          onChange={setDeviceOffset}
        />
      </div>

      {/* Per-model */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>{t("metrics.byModel")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("metrics.byModelHint")}
        </p>
        <div className="table-scroll">
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("logs.provider")}</th>
                <th>{t("logs.model")}</th>
                <th>{t("metrics.decisions")}</th>
                <th>{t("metrics.avgLatency")}</th>
                <th>{t("logs.confidence")}</th>
              </tr>
            </thead>
            <tbody>
              {models.loading && !models.data && <SkeletonRows cols={5} />}
              {(models.data?.items ?? []).map((m, i) => (
                <tr key={`${m.provider}-${m.model}-${i}`}>
                  <td data-label={t("logs.provider")}>
                    <span
                      className="chip"
                      style={
                        m.fallback
                          ? { color: "var(--error)", borderColor: "var(--error)" }
                          : undefined
                      }
                    >
                      {m.provider ?? "—"}
                    </span>
                    {m.fallback && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {t("metrics.fallbackRow")}
                      </div>
                    )}
                  </td>
                  <td className="mono muted" data-label={t("logs.model")}>
                    {m.model ?? "—"}
                  </td>
                  <td className="mono" data-label={t("metrics.decisions")}>
                    {m.decisions}
                  </td>
                  <td className="mono muted" data-label={t("metrics.avgLatency")}>
                    {num(m.avg_latency_ms, "ms")}
                  </td>
                  <td data-label={t("logs.confidence")} style={{ minWidth: 110 }}>
                    {m.avg_confidence == null ? (
                      "—"
                    ) : (
                      <Confidence value={m.avg_confidence} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!models.loading && (models.data?.total ?? 0) === 0 && (
          <EmptyState title={t("metrics.noDecisions")} />
        )}
        <Pager
          offset={modelOffset}
          page={PAGE}
          total={models.data?.total ?? 0}
          onChange={setModelOffset}
        />
      </div>

      {/* Failures */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>{t("metrics.failuresTitle")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("metrics.failuresHint")}
        </p>
        <div className="table-scroll">
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("common.when")}</th>
                <th>{t("common.robot")}</th>
                <th>{t("metrics.action")}</th>
                <th>{t("metrics.error")}</th>
                <th>{t("logs.latency")}</th>
              </tr>
            </thead>
            <tbody>
              {failures.loading && !failures.data && <SkeletonRows cols={5} />}
              {(failures.data?.items ?? []).map((f) => (
                <tr key={f.id}>
                  <td
                    className="muted"
                    data-label={t("common.when")}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {timeAgo(f.created_at)}
                  </td>
                  <td data-label={t("common.robot")}>
                    <Link href={`/robots/${f.robot_id}`}>{f.robot_name}</Link>
                  </td>
                  <td data-label={t("metrics.action")}>
                    <span className="chip">{f.action_type ?? "—"}</span>
                  </td>
                  <td data-label={t("metrics.error")} style={{ maxWidth: 380 }}>
                    {f.error ?? "—"}
                  </td>
                  <td className="mono muted" data-label={t("logs.latency")}>
                    {num(f.duration_ms, "ms")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!failures.loading && (failures.data?.total ?? 0) === 0 && (
          <EmptyState title={t("metrics.noFailures")} />
        )}
        <Pager
          offset={failureOffset}
          page={PAGE}
          total={failures.data?.total ?? 0}
          onChange={setFailureOffset}
        />
      </div>
    </main>
  );
}
