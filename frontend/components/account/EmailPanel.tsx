"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/**
 * Change the sign-in address.
 *
 * With mail configured the first submit only sends a code — to the *new*
 * address, which is what proves the person owns it.
 */
export function EmailPanel({
  codeRequired,
  onChanged,
}: {
  codeRequired: boolean;
  onChanged: () => Promise<void>;
}) {
  const { t } = useT();
  const { toast } = useFeedback();

  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (codeRequired && !codeSent) {
        await api.requestEmailCode(password, newEmail);
        setCodeSent(true);
        toast(t("account.codeSentToNew"), "success");
        return;
      }
      await api.changeEmail(password, newEmail, code || undefined);
      await onChanged();
      toast(t("account.emailChanged"), "success");
      setPassword("");
      setNewEmail("");
      setCode("");
      setCodeSent(false);
    } catch (err) {
      setError(errorMessage(err, t("account.changeFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={t("account.changeEmail")} hint={t("account.changeEmailHint")}>
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={submit} style={{ maxWidth: 360, marginTop: 4 }}>
        <label htmlFor="acc-email-new">{t("account.newEmail")}</label>
        <input
          id="acc-email-new"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{ width: "100%" }}
          required
        />

        <label htmlFor="acc-email-pw">{t("account.currentPassword")}</label>
        <PasswordInput
          id="acc-email-pw"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        {codeSent && (
          <>
            <label htmlFor="acc-email-code">{t("account.code")}</label>
            <input
              id="acc-email-code"
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
          disabled={busy || !newEmail || !password || (codeSent && !code)}
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
