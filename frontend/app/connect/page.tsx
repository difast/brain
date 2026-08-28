"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

const DEFAULT_CAPS = `[
  { "type": "move_forward", "description": "Drive forward", "value": { "type": "number", "min": 0, "max": 1, "unit": "m" } },
  { "type": "turn_left", "description": "Turn left", "value": { "type": "number", "min": 0, "max": 180, "unit": "deg" } },
  { "type": "turn_right", "description": "Turn right", "value": { "type": "number", "min": 0, "max": 180, "unit": "deg" } },
  { "type": "stop", "description": "Stop moving" }
]`;

function CopyField({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — value is still selectable in the field */
    }
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <label>{label}</label>
      <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="mono"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={copy} style={{ whiteSpace: "nowrap" }}>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  const { t } = useT();
  const [name, setName] = useState("rover-01");
  const [type, setType] = useState("rover");
  const [caps, setCaps] = useState(DEFAULT_CAPS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    robotId: string;
    token: string;
    apiKey: string;
  } | null>(null);

  async function register() {
    setError(null);
    setBusy(true);
    try {
      const capsParsed = JSON.parse(caps);
      const res = await api.register({
        name,
        robot_type: type,
        capabilities: capsParsed,
      });
      setResult({
        robotId: res.robot.id,
        token: res.token,
        apiKey: res.api_key,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>{t("connect.title")}</h1>
      <p className="sub">{t("connect.sub")}</p>

      {error && (
        <div className="error-box" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Register form */}
        <div className="panel">
          <h2>{t("connect.form")}</h2>
          <label>{t("connect.name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <label>{t("connect.type")}</label>
          <input value={type} onChange={(e) => setType(e.target.value)} />
          <label>{t("connect.caps")}</label>
          <textarea
            value={caps}
            onChange={(e) => setCaps(e.target.value)}
            rows={9}
            style={{ width: "100%", fontFamily: "var(--mono)" }}
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={register} disabled={busy}>
              {t("connect.registerBtn")}
            </button>
          </div>
        </div>

        {/* Credentials */}
        <div className="panel">
          <h2>{t("connect.creds")}</h2>
          {!result ? (
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {t("connect.credsHint")}
            </p>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 14, lineHeight: 1.6 }}>
                {t("connect.credsHint")}
              </p>
              <CopyField
                label={t("connect.robotId")}
                value={result.robotId}
                copyLabel={t("connect.copy")}
                copiedLabel={t("connect.copied")}
              />
              <CopyField
                label={t("connect.token")}
                value={result.token}
                copyLabel={t("connect.copy")}
                copiedLabel={t("connect.copied")}
              />
              <CopyField
                label={t("connect.apiKey")}
                value={result.apiKey}
                copyLabel={t("connect.copy")}
                copiedLabel={t("connect.copied")}
              />

              <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <h2>{t("connect.next")}</h2>
                <div className="row">
                  <Link href={`/robots/${result.robotId}`}>
                    {t("connect.openRobot")}
                  </Link>
                  <span className="muted">·</span>
                  <Link href="/sdk">{t("connect.nextSdk")}</Link>
                </div>
                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={() => setResult(null)}
                    style={{ background: "var(--panel-2)", color: "var(--text)" }}
                  >
                    {t("connect.again")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
