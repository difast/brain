"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type AuditAction } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";
import { Pager } from "@/components/ui";
import { EmptyState, SkeletonRows } from "@/components/feedback";
import { useT } from "@/lib/i18n";

const PAGE = 20;

const ACTION_KEYS: Record<AuditAction, string> = {
  login: "account.actionLogin",
  login_failed: "account.actionLoginFailed",
  password_changed: "account.actionPasswordChanged",
  email_changed: "account.actionEmailChanged",
  avatar_changed: "account.actionAvatarChanged",
};

export default function AccountActivityPage() {
  const { t } = useT();
  const [offset, setOffset] = useState(0);
  const { data, loading } = usePoll(
    () => api.listActivity({ limit: PAGE, offset }),
    15000,
    [offset],
  );
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <main className="container">
      <Link href="/account" style={{ fontSize: 13, fontWeight: 600 }}>
        ← {t("account.backToAccount")}
      </Link>

      <h1 style={{ marginTop: 12 }}>{t("account.activityTitle")}</h1>
      <p className="sub">{t("account.activitySub")}</p>

      <div className="panel">
        <div className="table-scroll">
          <table className="cards-table">
            <thead>
              <tr>
                <th>{t("account.activityWhen")}</th>
                <th>{t("account.activityAction")}</th>
                <th>{t("account.activityIp")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && <SkeletonRows cols={3} />}
              {items.map((entry) => (
                <tr key={entry.id}>
                  <td data-label={t("account.activityWhen")} className="muted" style={{ whiteSpace: "nowrap" }}>
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td data-label={t("account.activityAction")}>
                    <span className="chip">
                      {t(ACTION_KEYS[entry.action] ?? entry.action)}
                    </span>
                  </td>
                  <td data-label={t("account.activityIp")} className="mono muted">
                    {entry.ip ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && items.length === 0 && (
          <EmptyState title={t("account.activityEmpty")} />
        )}

        <Pager offset={offset} page={PAGE} total={total} onChange={setOffset} />
      </div>
    </main>
  );
}
