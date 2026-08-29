"use client";

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
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}
