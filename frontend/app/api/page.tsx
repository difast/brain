"use client";

import { useState } from "react";
import { api, API_BASE, type ApiKeyCreated } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { timeAgo } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { useT } from "@/lib/i18n";

export default function ApiPage() {
  const { t } = useT();
  const { toast, confirm } = useFeedback();
  const { data } = usePoll(() => api.listApiKeys(), 6000);
  const keys = data ?? [];

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function generate() {
    if (!name.trim()) {
      setFormError(t("api.nameError"));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const key = await api.createApiKey(name);
      setCreated(key);
      setName("");
      toast(t("toast.keyCreated"));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    const ok = await confirm({
      title: t("confirm.revokeTitle"),
      body: t("confirm.revokeBody"),
      confirmLabel: t("confirm.revoke"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.revokeApiKey(id);
      toast(t("toast.keyRevoked"));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    }
  }

  return (
    <main className="container">
      <h1>{t("api.title")}</h1>
      <p className="sub">
        {t("api.sub")} <span className="mono">{API_BASE}</span>
      </p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("api.generate")}</h2>
        {formError && <div className="error-box">{formError}</div>}
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px" }}>
            <label>{t("api.keyName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("api.namePlaceholder")}
              style={{ width: "100%" }}
            />
          </div>
          <button onClick={generate} disabled={busy}>
            {t("api.generateBtn")}
          </button>
        </div>

        {created && (
          <div style={{ marginTop: 16 }}>
            <div
              className="error-box"
              style={{
                borderColor: "var(--online)",
                color: "#1f7a52",
                background: "rgba(46,158,107,0.08)",
              }}
            >
              {t("api.copyOnce")}
            </div>
            <pre className="mono" style={{ marginTop: 8 }}>
              {created.key}
            </pre>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("api.enginesTitle")}</h2>
        <p style={{ lineHeight: 1.6 }}>{t("api.enginesBody")}</p>
        <div>
          <span className="chip">YandexGPT</span>
          <span className="chip">GigaChat</span>
          <span className="chip">Claude</span>
          <span className="chip">OpenAI</span>
          <span className="chip">Ollama / vLLM / LM Studio (local)</span>
        </div>
      </div>

      <div className="panel">
        <h2>{t("api.yourKeys")}</h2>
        <table className="cards-table">
          <thead>
            <tr>
              <th>{t("api.name")}</th>
              <th>{t("api.prefix")}</th>
              <th>{t("api.created")}</th>
              <th>{t("api.lastUsed")}</th>
              <th>{t("common.status")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td data-label={t("api.name")}>{k.name}</td>
                <td className="mono" data-label={t("api.prefix")}>
                  {k.prefix}…
                </td>
                <td className="muted" data-label={t("api.created")}>
                  {timeAgo(k.created_at)}
                </td>
                <td className="muted" data-label={t("api.lastUsed")}>
                  {k.last_used_at ? timeAgo(k.last_used_at) : t("common.never")}
                </td>
                <td data-label={t("common.status")}>
                  <span className={`badge ${k.revoked ? "error" : "online"}`}>
                    <span className="dot" />
                    {k.revoked ? t("common.revoked") : t("common.active")}
                  </span>
                </td>
                <td>
                  {!k.revoked && (
                    <button
                      onClick={() => revoke(k.id)}
                      style={{
                        background: "transparent",
                        color: "var(--error)",
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                      }}
                    >
                      {t("api.revoke")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && <div className="empty">{t("api.empty")}</div>}
      </div>
    </main>
  );
}
