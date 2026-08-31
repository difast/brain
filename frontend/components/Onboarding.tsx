"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { useT } from "@/lib/i18n";

/** The three-line version of "connect a device", for the empty dashboard. */
function snippet(apiBase: string): string {
  return `pip install "mevratek-sdk @ git+https://github.com/difast/brain#subdirectory=sdk/python"

from mevratek import BrainClient

bot = BrainClient.register(
    "${apiBase}",
    name="rover-01",
    robot_type="rover",
    capabilities=[
        {"type": "move_forward", "value": {"type": "number", "min": 0, "max": 1}},
        {"type": "turn_left", "value": {"type": "number", "min": 0, "max": 180}},
        {"type": "stop"},
    ],
)
print("token:", bot.token)          # сохраните — им устройство входит потом

bot.heartbeat()
bot.send_telemetry(battery=82, speed=0.0)
decision = bot.decide(task="объехать препятствие", state={"battery": 82})
print(decision["actions"])`;
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        aria-hidden
        style={{
          flex: "0 0 auto",
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "var(--accent-strong)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {number}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Onboarding() {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const code = snippet(API_BASE);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the snippet is still selectable */
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 880 }}>
      <h2 style={{ marginBottom: 4 }}>{t("onboarding.title")}</h2>
      <p className="muted" style={{ marginTop: 0, maxWidth: 820 }}>
        {t("onboarding.sub")}
      </p>

      <div
        style={{
          display: "grid",
          gap: 18,
          margin: "20px 0 4px",
          maxWidth: 820,
        }}
      >
        <Step number={1} title={t("onboarding.step1")}>
          {t("onboarding.step1Body")}
          <div style={{ marginTop: 6 }}>
            <Link href="/connect">{t("onboarding.step1Link")}</Link>
          </div>
        </Step>
        <Step number={2} title={t("onboarding.step2")}>
          {t("onboarding.step2Body")}
        </Step>
        <Step number={3} title={t("onboarding.step3")}>
          {t("onboarding.step3Body")}
          <div style={{ marginTop: 6 }}>
            <Link href="/logs">{t("nav.logs")}</Link>
            {" · "}
            <Link href="/docs">{t("nav.docs")}</Link>
          </div>
        </Step>
      </div>

      <div style={{ position: "relative", marginTop: 16, maxWidth: 820 }}>
        <button
          type="button"
          onClick={copy}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "var(--panel)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "4px 10px",
            fontSize: 12,
          }}
        >
          {copied ? t("onboarding.copied") : t("onboarding.copy")}
        </button>
        <pre
          className="mono"
          style={{
            margin: 0,
            padding: "14px 16px",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflowX: "auto",
            fontSize: 12,
            lineHeight: 1.65,
            color: "var(--text)",
          }}
        >
          {code}
        </pre>
      </div>

      <div
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          maxWidth: 820,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {t("onboarding.noDevice")}
        </div>
        <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
          {t("onboarding.noDeviceBody")}
        </p>
        <Link
          href="/simulator"
          className="nav-logout"
          style={{ display: "inline-block" }}
        >
          {t("onboarding.openSimulator")}
        </Link>
      </div>
    </div>
  );
}
