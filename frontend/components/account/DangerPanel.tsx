"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage, type DeleteAccountPreview } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/components/feedback";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/**
 * Deleting your own account.
 *
 * Irreversible, so it is deliberately awkward: the password, a code from
 * email when mail is configured, and — for the last member of an
 * organization, who takes the whole tenant with them — typing the word.
 * The server enforces all of it; this only makes the consequence legible
 * before the click rather than after.
 */
export function DangerPanel({ codeRequired }: { codeRequired: boolean }) {
  const { t } = useT();
  const { toast } = useFeedback();
  const { logout } = useAuth();
  const router = useRouter();

  const [preview, setPreview] = useState<DeleteAccountPreview | null>(null);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPreview(await api.accountDeletable());
    } catch {
      /* the panel stays collapsed rather than breaking the page */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!preview) return null;

  const takesOrganization = preview.deletes_organization;
  // Typing the confirmation word is only asked of the person whose deletion
  // also destroys the organization's devices and history.
  const confirmWord = t("danger.confirmWord");
  const wordOk = !takesOrganization || typed.trim().toUpperCase() === confirmWord;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (codeRequired && !codeSent) {
        await api.requestDeleteCode(password);
        setCodeSent(true);
        toast(t("danger.codeSent"), "success");
        return;
      }
      const result = await api.deleteAccount(password, code || undefined);
      toast(
        result.organization_deleted ? t("danger.deletedOrg") : t("danger.deleted"),
        "success",
      );
      // The session is dead server-side; clear the local one and leave.
      logout();
      router.replace("/login");
    } catch (err) {
      setError(errorMessage(err, t("danger.failed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      danger
      title={t("danger.title")}
      hint={
        takesOrganization ? t("danger.hintLastMember") : t("danger.hintMember")
      }
    >
      {!preview.allowed && (
        <div className="error-box" style={{ marginTop: 4 }}>
          {preview.reason}
        </div>
      )}

      {preview.allowed && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            color: "var(--error)",
            border: "1px solid var(--error)",
          }}
        >
          {t("danger.start")}
        </button>
      )}

      {preview.allowed && open && (
        <form onSubmit={submit} style={{ maxWidth: 380, marginTop: 4 }}>
          {error && <div className="error-box">{error}</div>}

          <label htmlFor="danger-password">{t("account.currentPassword")}</label>
          <PasswordInput
            id="danger-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />

          {takesOrganization && (
            <>
              <label htmlFor="danger-word">
                {t("danger.typeToConfirm").replace("{word}", confirmWord)}
              </label>
              <input
                id="danger-word"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                style={{ width: "100%" }}
              />
            </>
          )}

          {codeSent && (
            <>
              <label htmlFor="danger-code">{t("account.code")}</label>
              <input
                id="danger-code"
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

          <div className="row" style={{ gap: 8, marginTop: 16 }}>
            <button
              type="submit"
              disabled={busy || !password || !wordOk || (codeSent && !code)}
              style={{ background: "var(--error)", color: "#fff" }}
            >
              {busy ? (
                <Spinner />
              ) : codeRequired && !codeSent ? (
                t("account.sendCode")
              ) : (
                t("danger.confirm")
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setCode("");
                setTyped("");
                setCodeSent(false);
                setError(null);
              }}
              disabled={busy}
              style={{ background: "var(--panel-2)", color: "var(--text)" }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}
