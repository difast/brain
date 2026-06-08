"use client";

import { useState } from "react";
import { api, API_BASE, type ApiKeyCreated } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { timeAgo } from "@/components/ui";

export default function ApiPage() {
  const { data, error } = usePoll(() => api.listApiKeys(), 6000);
  const keys = data ?? [];

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function generate() {
    if (!name.trim()) {
      setFormError("Enter a name for the key.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const key = await api.createApiKey(name);
      setCreated(key);
      setName("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await api.revokeApiKey(id);
  }

  return (
    <main className="container">
      <h1>API Access</h1>
      <p className="sub">
        Generate a personal API key for each user/application. Use it with the
        SDK or send it as the <code>X-API-Key</code> header. Base URL:{" "}
        <span className="mono">{API_BASE}</span>
      </p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>Generate a new key</h2>
        {formError && <div className="error-box">{formError}</div>}
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px" }}>
            <label>Key name (who/what it&apos;s for)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. alice-rover-fleet"
              style={{ width: "100%" }}
            />
          </div>
          <button onClick={generate} disabled={busy}>
            Generate key
          </button>
        </div>

        {created && (
          <div style={{ marginTop: 16 }}>
            <div className="error-box" style={{ borderColor: "var(--online)", color: "#1f7a52", background: "rgba(46,158,107,0.08)" }}>
              Copy this key now — it is shown <strong>only once</strong>.
            </div>
            <pre className="mono" style={{ marginTop: 8 }}>{created.key}</pre>
          </div>
        )}
      </div>

      {error && <div className="error-box">Cannot reach API: {error}</div>}

      <div className="panel">
        <h2>Your API keys</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Last used</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td className="mono">{k.prefix}…</td>
                <td className="muted">{timeAgo(k.created_at)}</td>
                <td className="muted">
                  {k.last_used_at ? timeAgo(k.last_used_at) : "never"}
                </td>
                <td>
                  <span className={`badge ${k.revoked ? "error" : "online"}`}>
                    <span className="dot" />
                    {k.revoked ? "revoked" : "active"}
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
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && <div className="empty">No keys yet.</div>}
      </div>
    </main>
  );
}
