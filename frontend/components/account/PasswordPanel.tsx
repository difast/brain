"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/**
 * Change the password.
 *
 * Succeeding signs every other device out, which is the point — a password
 * change is how you lock an intruder out — so the sessions list is reloaded.
 */
export function PasswordPanel({
  codeRequired,
  onChanged,
}: {
  codeRequired: boolean;
  onChanged: () => Promise<void>;
}) {
  const { t } = useT();
  const { toast } = useFeedback();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (codeRequired && !codeSent) {
        await api.requestPasswordCode(current);
        setCodeSent(true);
        toast(t("account.codeSent"), "success");
        return;
      }
      await api.changePassword(current, next, code || undefined);
      await onChanged();
      toast(t("account.changed"), "success");
      setCurrent("");
      setNext("");
      setConfirm("");
      setCode("");
      setCodeSent(false);
    } catch (err) {
      setError(errorMessage(err, t("account.changeFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title={t("account.changePassword")}
      hint={t("account.changePasswordHint")}
    >
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

        {codeSent && (
          <>
            <label htmlFor="acc-pw-code">{t("account.code")}</label>
            <input
              id="acc-pw-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="12345"
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                letterSpacing: 4,
              }}
            />
          </>
        )}

        <button
          type="submit"
          disabled={
            busy || !current || !next || !confirm || (codeSent && !code)
          }
          style={{ marginTop: 16 }}
        >
          {busy ? (
            <Spinner />
          ) : codeRequired && !codeSent ? (
            t("account.sendCode")
          ) : (
            t("account.save")
          )}
        </button>
      </form>
    </Panel>
  );
}
