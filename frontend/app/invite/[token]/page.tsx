"use client";

import { useEffect, useState } from "react";
import { inviteApi, setToken, type InvitePublic } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n";

export default function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { t } = useT();
  const { token } = params;

  const [invite, setInvite] = useState<InvitePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    inviteApi
      .get(token)
      .then((inv) => active && setInvite(inv))
      .catch(() => active && setInvite(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("invite.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("invite.mismatch"));
      return;
    }
    setBusy(true);
    try {
      const res = await inviteApi.accept(token, password);
      // Auto sign-in with the freshly created account.
      setToken(res.token);
      window.location.assign("/");
    } catch {
      setError(t("invite.failed"));
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          ◎ Mevra<span>tek</span>
        </div>

        {loading ? (
          <p className="login-hint" style={{ marginTop: 12 }}>
            {t("invite.loading")}
          </p>
        ) : !invite || !invite.valid ? (
          <>
            <h1 className="login-title">{t("invite.title")}</h1>
            <div className="error-box">{t("invite.invalid")}</div>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="login-title">{t("invite.title")}</h1>
            <p className="login-hint" style={{ marginTop: 0 }}>
              {t("invite.subtitle")}
            </p>

            <div className="invite-meta">
              <div>
                <span className="muted">{t("invite.forEmail")}:</span>{" "}
                <strong>{invite.email}</strong>
              </div>
              <div>
                <span className="muted">{t("invite.forOrg")}:</span>{" "}
                {invite.organization_name}
              </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            <label htmlFor="pw">{t("invite.newPassword")}</label>
            <PasswordInput
              id="pw"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              autoFocus
            />
            <label htmlFor="pw2">{t("invite.confirm")}</label>
            <PasswordInput
              id="pw2"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="login-submit"
              disabled={busy || !password || !confirm}
            >
              {busy ? (
                <span className="btn-loading">
                  <Spinner /> {t("invite.submitting")}
                </span>
              ) : (
                t("invite.submit")
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
