"use client";

import { type AuthUser } from "@/lib/api";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/** Who you are signed in as. Read-only — each field is changed elsewhere. */
export function ProfilePanel({
  user,
  organizationName,
}: {
  user: AuthUser;
  organizationName: string;
}) {
  const { t, lang } = useT();

  const roleLabel =
    user.role === "admin" ? t("admin.roleAdmin") : t("admin.roleMember");
  const memberSince = new Date(user.created_at).toLocaleDateString(
    lang === "ru" ? "ru-RU" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <Panel title={t("account.info")}>
      <table>
        <tbody>
          <tr>
            <th>{t("account.email")}</th>
            <td className="mono">{user.email}</td>
          </tr>
          <tr>
            <th>{t("account.org")}</th>
            <td>{organizationName}</td>
          </tr>
          <tr>
            <th>{t("account.role")}</th>
            <td>
              <span className="chip">{roleLabel}</span>
            </td>
          </tr>
          <tr>
            <th>{t("account.since")}</th>
            <td className="muted">{memberSince}</td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}
