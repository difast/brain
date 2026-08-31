"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useFeedback } from "@/components/feedback";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";

export default function AccountPage() {
  const { t, lang } = useT();
  const { user, organization } = useAuth();
  const { toast } = useFeedback();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !organization) return null;

  const roleLabel = user.role === "admin" ? t("admin.roleAdmin") : t("admin.roleMember");
  const memberSince = new Date(user.created_at).toLocaleDateString(
    lang === "ru" ? "ru-RU" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 6) {
      setError(t("account.tooShort"));
      return;
    }
    if (next !== confirm) {
      setError(t("account.mismatch"));
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      toast(t("account.changed"), "success");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>{t("account.title")}</h1>
      <p className="sub">{t("account.sub")}</p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("account.info")}</h2>
        <table>
          <tbody>
            <tr>
              <th>{t("account.email")}</th>
              <td className="mono">{user.email}</td>
            </tr>
            <tr>
              <th>{t("account.org")}</th>
              <td>{organization.name}</td>
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
      </div>

      <div className="panel">
        <h2>{t("account.changePassword")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("account.changePasswordHint")}
        </p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={submit} style={{ maxWidth: 360, marginTop: 4 }}>
          <label htmlFor="acc-current">{t("account.currentPassword")}</label>
          <PasswordInput
            id="acc-current"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />

          <label htmlFor="acc-new">{t("account.newPassword")}</label>
          <PasswordInput
            id="acc-new"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />

          <label htmlFor="acc-confirm">{t("account.confirmPassword")}</label>
          <PasswordInput
            id="acc-confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            style={{ marginTop: 16 }}
          >
            {busy ? <Spinner /> : t("account.save")}
          </button>
        </form>
      </div>
    </main>
  );
}
