"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage, type OrganizationDetail } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { Spinner } from "@/components/ui";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/**
 * The organization itself: its name, when it was created, and how many people
 * are in it. An administrator can rename it in place; everyone else reads it.
 */
export function OrganizationPanel({
  canManage,
  onRenamed,
}: {
  canManage: boolean;
  onRenamed: () => Promise<void>;
}) {
  const { t, lang } = useT();
  const { toast } = useFeedback();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrg(await api.getOrganization());
    } catch {
      /* the panel stays empty rather than breaking the page */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    try {
      setOrg(await api.renameOrganization(name));
      setEditing(false);
      // The name is shown in several places, so refresh the shared copy too.
      await onRenamed();
      toast(t("org.renamed"), "success");
    } catch (e) {
      toast(errorMessage(e, t("org.renameFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!org) {
    return (
      <Panel title={t("org.title")}>
        <Spinner />
      </Panel>
    );
  }

  const created = new Date(org.created_at).toLocaleDateString(
    lang === "ru" ? "ru-RU" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <Panel title={t("org.title")} hint={t("org.hint")}>
      <table>
        <tbody>
          <tr>
            <th>{t("org.name")}</th>
            <td>
              {editing ? (
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <input
                    id="org-name"
                    autoFocus
                    value={draft}
                    maxLength={255}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    style={{ minWidth: 220 }}
                  />
                  <button onClick={save} disabled={busy || !draft.trim()}>
                    {busy ? <Spinner /> : t("common.save")}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    disabled={busy}
                    style={{ background: "var(--panel-2)", color: "var(--text)" }}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <div
                  className="row"
                  style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
                >
                  <span>{org.name}</span>
                  {canManage && (
                    <button
                      onClick={() => {
                        setDraft(org.name);
                        setEditing(true);
                      }}
                      style={{
                        background: "transparent",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                        padding: "3px 10px",
                        fontSize: 12,
                      }}
                    >
                      {t("org.rename")}
                    </button>
                  )}
                </div>
              )}
            </td>
          </tr>
          <tr>
            <th>{t("org.members")}</th>
            <td className="mono">{org.member_count}</td>
          </tr>
          <tr>
            <th>{t("org.created")}</th>
            <td className="muted">{created}</td>
          </tr>
          <tr>
            <th>{t("org.id")}</th>
            {/* A 32-character hash with nothing to break on pushed the whole
                page 58px wider than a phone screen. */}
            <td className="mono muted" style={{ overflowWrap: "anywhere" }}>
              {org.id}
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}
