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

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}
