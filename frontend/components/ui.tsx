"use client";

import { useEffect, useRef, useState } from "react";
import type { RobotStatus } from "@/lib/api";
import { useT } from "@/lib/i18n";

export function StatusBadge({ status }: { status: RobotStatus }) {
  const { t } = useT();
  return (
    <span className={`badge ${status}`}>
      <span className="dot" />
      {t(`common.${status}`)}
    </span>
  );
}

export function DemoBadge({ meta }: { meta: Record<string, unknown> }) {
  const { t } = useT();
  if (!meta || meta.demo !== true) return null;
  return <span className="demo-badge">{t("common.demo")}</span>;
}

export function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="row" style={{ alignItems: "center", gap: 8 }}>
      <div className="confidence-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="mono">{pct}%</span>
    </div>
  );
}

export function Actions({
  actions,
}: {
  actions: { type: string; value: unknown }[];
}) {
  if (!actions.length) return <span className="muted">—</span>;
  return (
    <span>
      {actions.map((a, i) => (
        <span key={i} className="chip">
          {a.type}
          {a.value !== null && a.value !== undefined ? `=${a.value}` : ""}
        </span>
      ))}
    </span>
  );
}

/**
 * Counts per time bucket — the decision flow on /metrics.
 *
 * A Sparkline was standing in for this: 130 pixels of line in a full-width
 * panel, no axis, no values, no idea what the horizontal span meant. At six
 * decisions it read as a rendering error rather than as data.
 *
 * Bars rather than a line because the buckets are discrete counts, not a
 * continuous quantity sampled over time. One series, so one colour and no
 * legend — the panel heading says what is plotted. Axis text stays in the text
 * tokens; only the bars carry the accent.
 *
 * Geometry is computed against the measured width instead of stretching a
 * fixed viewBox: `preserveAspectRatio="none"` would smear the rounded bar tops
 * into ellipses and distort every stroke.
 */
export function TimeBars({
  points,
  label,
  formatBucket,
  nowLabel,
  emptyLabel,
  height = 132,
}: {
  points: { start: string; value: number }[];
  /** Screen-reader summary of the whole chart. */
  label: string;
  /** Bucket start -> axis text, e.g. "14:00" or "3 сен". */
  formatBucket: (start: string) => string;
  /**
   * What to call the right-hand end of the axis.
   *
   * The last bucket is the one still filling up, so its right edge is the
   * present moment — and naming it that way is the only thing that makes the
   * axis readable over a 24-hour window. Printing its *start* instead put
   * "23:09" on the left and "22:09" on the right, which is correct to the
   * minute (yesterday evening through to the last full hour) and still reads
   * as time running backwards. The exact bucket time stays one hover away on
   * every bar.
   */
  nowLabel: string;
  emptyLabel: string;
  height?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const total = points.reduce((sum, p) => sum + p.value, 0);

  // Y axis stops at a round number, so the ticks read 0 / 5 / 10 rather than
  // 0 / 3.5 / 7.
  const peak = Math.max(0, ...points.map((p) => p.value));
  const top = niceCeiling(peak);
  const ticks = [top, Math.round(top / 2), 0];

  const PLOT_LEFT = 34;   // room for the y-axis numbers
  const PLOT_TOP = 6;
  const plotWidth = Math.max(0, width - PLOT_LEFT);
  const plotHeight = height - PLOT_TOP - 18;   // 18 = the x-axis line of text

  // A 2px gap in the surface colour is what separates neighbouring bars; bars
  // are capped so a short series does not turn into slabs.
  const slot = points.length ? plotWidth / points.length : 0;
  const barWidth = Math.max(1, Math.min(24, slot - 2));

  return (
    <div ref={wrap} className="timebars">
      {total === 0 ? (
        <div className="timebars-empty">{emptyLabel}</div>
      ) : (
        <>
          <svg
            width={width || undefined}
            height={height}
            role="img"
            aria-label={label}
          >
            {ticks.map((tick) => {
              const y = PLOT_TOP + plotHeight * (1 - (top ? tick / top : 0));
              return (
                <g key={tick}>
                  <line
                    x1={PLOT_LEFT}
                    x2={width}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="1"
                  />
                  <text
                    x={PLOT_LEFT - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--muted)"
                    fontSize="11"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {points.map((point, i) => {
              const barHeight = top
                ? Math.round((point.value / top) * plotHeight)
                : 0;
              return (
                <rect
                  key={point.start}
                  x={PLOT_LEFT + i * slot + (slot - barWidth) / 2}
                  y={PLOT_TOP + plotHeight - barHeight}
                  width={barWidth}
                  height={Math.max(point.value > 0 ? 2 : 0, barHeight)}
                  rx={barWidth >= 8 ? 3 : 1}
                  fill="var(--accent)"
                >
                  {/* The per-bar readout. Every value stays reachable without
                      labelling all of them, which at 30 buckets is noise. */}
                  <title>{`${formatBucket(point.start)} — ${point.value}`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="timebars-x" style={{ paddingLeft: PLOT_LEFT }}>
            <span>{formatBucket(points[0].start)}</span>
            <span>{nowLabel}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** Round an axis maximum up to something a person would choose. */
function niceCeiling(value: number): number {
  if (value <= 0) return 0;
  if (value <= 5) return value;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return Math.round(candidate);
  }
  return Math.round(10 * magnitude);
}

export function Sparkline({
  values,
  color = "var(--accent)",
  width = 130,
  height = 34,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2)
    return (
      <span className="muted mono" style={{ fontSize: 12 }}>
        —
      </span>
    );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - pad * 2) + pad;
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Pager({
  offset,
  page,
  total,
  onChange,
}: {
  offset: number;
  page: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  const { t } = useT();
  if (total <= page && offset === 0) return null; // single page, no controls
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + page, total);
  return (
    <div className="pager">
      <span className="mono">
        {start}–{end} {t("page.of")} {total}
      </span>
      <button disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - page))}>
        ← {t("page.prev")}
      </button>
      <button
        disabled={offset + page >= total}
        onClick={() => onChange(offset + page)}
      >
        {t("page.next")} →
      </button>
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  // A future timestamp (an invite's expiry, say) would otherwise read as
  // "-259200s ago"; show when it falls due instead.
  if (s < 0) return timeUntil(iso);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

/** How long until a future timestamp. Past ones read as "now". */
export function timeUntil(iso: string): string {
  const s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (s <= 0) return "now";
  if (s < 3600) return `in ${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `in ${Math.floor(s / 3600)}h`;
  return `in ${Math.floor(s / 86400)}d`;
}
