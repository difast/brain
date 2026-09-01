"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, errorMessage, type ApiKey } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { Spinner, timeAgo } from "@/components/ui";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/**
 * Organization API keys — what a device presents to register itself.
 *
 * Lives here as well as on /api because this is where someone looks after the
 * SDK tells them they need a `cbk_…` key.
 *
 * The secret is returned once at creation and never again, so it is held in
 * component state until the person dismisses it.
 */
export function ApiKeysPanel() {
  const { t } = useT();
  const { toast, confirm } = useFeedback();

  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys(await api.listApiKeys());
    } catch (e) {
      toast(errorMessage(e, t("apikeys.loadFailed")), "error");
      setKeys([]);
    }
  }, [toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await api.createApiKey(name.trim());
      setFreshSecret(created.key);
      setName("");
      await load();
    } catch (err) {
      toast(errorMessage(err, t("apikeys.createFailed")), "error");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(key: ApiKey) {
    const ok = await confirm({
      title: t("apikeys.revokeTitle"),
      body: `${t("apikeys.revokeBody")} ${key.name}`,
      confirmLabel: t("apikeys.revoke"),
      danger: true,
    });
    if (!ok) return;

    setBusyId(key.id);
    try {
      await api.revokeApiKey(key.id);
      await load();
      toast(t("apikeys.revoked"), "success");
    } catch (err) {
      toast(errorMessage(err, t("apikeys.revokeFailed")), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      toast(t("apikeys.copied"), "success");
    } catch {
      /* clipboard blocked — the value is selectable on screen */
    }
  }

  if (!keys) {
    return (
      <Panel title={t("apikeys.title")}>
        <Spinner />
      </Panel>
    );
  }

  const live = keys.filter((k) => !k.revoked);

  return (
    <Panel title={t("apikeys.title")} hint={t("apikeys.hint")}>
      {freshSecret && (
        <div
          style={{
            border: "1px solid var(--accent-strong)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {t("apikeys.shownOnce")}
          </div>
          <pre
            className="mono"
            style={{
              margin: "8px 0",
              padding: "10px 12px",
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              overflowX: "auto",
            }}
          >
            {freshSecret}
          </pre>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" onClick={() => copy(freshSecret)}>
              {t("apikeys.copy")}
            </button>
            <button
              type="button"
              onClick={() => setFreshSecret(null)}
              style={{
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {t("apikeys.dismiss")}
            </button>
          </div>
        </div>
      )}

      {live.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("apikeys.name")}</th>
                <th>{t("apikeys.prefix")}</th>
                <th>{t("apikeys.lastUsed")}</th>
                <th>{t("apikeys.created")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {live.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="mono muted">{k.prefix}…</td>
                  <td className="muted">
                    {k.last_used_at ? timeAgo(k.last_used_at) : t("common.never")}
                  </td>
                  <td className="muted">{timeAgo(k.created_at)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => revoke(k)}
                      disabled={busyId === k.id}
                      style={{
                        background: "transparent",
                        color: "var(--error)",
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                      }}
                    >
                      {t("apikeys.revoke")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {live.length === 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          {t("apikeys.empty")}
        </p>
      )}

      <form
        onSubmit={create}
        className="row"
        style={{ gap: 8, alignItems: "flex-end", marginTop: 16, flexWrap: "wrap" }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 200 }}>
          <label htmlFor="apikey-name">{t("apikeys.newName")}</label>
          <input
            id="apikey-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("apikeys.newPlaceholder")}
            maxLength={255}
            style={{ width: "100%" }}
          />
        </div>
        <button type="submit" disabled={creating || !name.trim()}>
          {creating ? <Spinner /> : t("apikeys.create")}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        {t("apikeys.seeAlso")} <Link href="/sdk">SDK</Link>
        {" · "}
        <Link href="/api">{t("nav.api")}</Link>
      </p>
    </Panel>
  );
}
