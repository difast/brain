"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useSmartCaptcha } from "@/lib/captcha";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { api, UnauthorizedError, errorMessage } from "@/lib/api";

const CONTACTS_URL = "https://mevratek.ru/contacts";

export default function LoginPage() {
  const { t, lang, setLang } = useT();
  const { status, login, completeLogin } = useAuth();
  const { enabled: captchaEnabled, token: captchaToken, containerRef, reset } =
    useSmartCaptcha();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set once the password step asks for the code emailed to the account.
  const [challenge, setChallenge] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Password recovery: "request" asks for the email, "confirm" takes the code
  // and the new password. null means the normal sign-in flow.
  const [resetStep, setResetStep] = useState<"request" | "confirm" | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in → go to the dashboard.
  useEffect(() => {
    if (status === "authed") router.replace("/");
  }, [status, router]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    // Login proceeds only after the captcha (when enabled) has been passed.
    if (captchaEnabled && !captchaToken) {
      setError(t("auth.captchaNeeded"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await login(email.trim(), password, captchaToken);
      if (res.code_required && res.challenge) {
        setChallenge(res.challenge);
        setMaskedEmail(res.masked_email);
        setCode("");
      } else {
        router.replace("/");
      }
    } catch (e) {
      // A bad credential is a generic 401; rate limits and mail failures carry
      // a message worth showing as-is.
      setError(
        e instanceof UnauthorizedError
          ? t("auth.invalid")
          : errorMessage(e, t("auth.invalid")),
      );
      reset();
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!challenge || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await completeLogin(challenge, code.trim());
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e, t("auth.codeInvalid")));
    } finally {
      setBusy(false);
    }
  }

  function backToPassword() {
    setChallenge(null);
    setResetStep(null);
    setCode("");
    setError(null);
    setNotice(null);
    setPassword("");
    setResetPassword("");
    reset();
  }

  async function submitResetRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestPasswordReset(email.trim());
      setMaskedEmail(res.masked_email);
      setResetStep("confirm");
      setCode("");
      // Deliberately the same message whether or not the account exists.
      setNotice(t("auth.resetSent"));
    } catch (e) {
      setError(errorMessage(e, t("auth.resetFailed")));
    } finally {
      setBusy(false);
    }
  }

  async function submitResetConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || resetPassword.length < 6) {
      setError(t("auth.resetTooShort"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.confirmPasswordReset(email.trim(), code.trim(), resetPassword);
      backToPassword();
      setNotice(t("auth.resetDone"));
    } catch (e) {
      setError(errorMessage(e, t("auth.codeInvalid")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form
        className="login-card"
        onSubmit={
          resetStep === "request"
            ? submitResetRequest
            : resetStep === "confirm"
              ? submitResetConfirm
              : challenge
                ? submitCode
                : submitPassword
        }
      >
        <div className="login-lang">
          <button
            type="button"
            className={lang === "ru" ? "active" : ""}
            onClick={() => setLang("ru")}
          >
            RU
          </button>
          <button
            type="button"
            className={lang === "en" ? "active" : ""}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>

        <div className="login-brand">
          ◎ Mevra<span>tek</span>
        </div>
        <h1 className="login-title">
          {resetStep
            ? t("auth.resetTitle")
            : challenge
              ? t("auth.codeTitle")
              : t("auth.title")}
        </h1>

        {error && <div className="error-box">{error}</div>}
        {notice && !error && <p className="login-hint">{notice}</p>}

        {resetStep === "request" ? (
          <>
            <p className="login-hint" style={{ marginTop: 0 }}>
              {t("auth.resetHint")}
            </p>

            <label htmlFor="reset-email">{t("auth.email")}</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.ru"
            />

            <button
              type="submit"
              className="login-submit"
              disabled={busy || !email.trim()}
            >
              {busy ? (
                <span className="btn-loading">
                  <Spinner /> {t("auth.resetSending")}
                </span>
              ) : (
                t("auth.resetSubmit")
              )}
            </button>

            <div className="login-request">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  backToPassword();
                }}
              >
                {t("auth.resetBack")}
              </a>
            </div>
          </>
        ) : resetStep === "confirm" ? (
          <>
            <p className="login-hint" style={{ marginTop: 0 }}>
              {t("auth.codeSentTo")} <b>{maskedEmail ?? email}</b>
            </p>

            <label htmlFor="reset-code">{t("auth.code")}</label>
            <input
              id="reset-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="12345"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 20,
                letterSpacing: 6,
                textAlign: "center",
              }}
            />

            <label htmlFor="reset-password">{t("auth.resetNewPassword")}</label>
            <PasswordInput
              id="reset-password"
              value={resetPassword}
              onChange={setResetPassword}
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="login-submit"
              disabled={busy || !code.trim() || !resetPassword}
            >
              {busy ? (
                <span className="btn-loading">
                  <Spinner /> {t("auth.resetSending")}
                </span>
              ) : (
                t("auth.resetConfirm")
              )}
            </button>

            <p className="login-hint">{t("auth.resetSessionsNote")}</p>

            <div className="login-request">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  backToPassword();
                }}
              >
                {t("auth.resetBack")}
              </a>
            </div>
          </>
        ) : challenge ? (
          <>
            <p className="login-hint" style={{ marginTop: 0 }}>
              {t("auth.codeSentTo")} <b>{maskedEmail}</b>
            </p>

            <label htmlFor="code">{t("auth.code")}</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="12345"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 20,
                letterSpacing: 6,
                textAlign: "center",
              }}
            />

            <button
              type="submit"
              className="login-submit"
              disabled={busy || !code.trim()}
            >
              {busy ? (
                <span className="btn-loading">
                  <Spinner /> {t("auth.signingIn")}
                </span>
              ) : (
                t("auth.codeSubmit")
              )}
            </button>

            <p className="login-hint">{t("auth.codeHint")}</p>

            <div className="login-request">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  backToPassword();
                }}
              >
                {t("auth.codeBack")}
              </a>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.ru"
            />

            <label htmlFor="password">{t("auth.password")}</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            {/* Yandex SmartCaptcha — appears here when a sitekey is configured. */}
            <div ref={containerRef} className="captcha-box" />

            <button
              type="submit"
              className="login-submit"
              disabled={
                busy ||
                !email.trim() ||
                !password ||
                (captchaEnabled === true && !captchaToken)
              }
            >
              {busy ? (
                <span className="btn-loading">
                  <Spinner /> {t("auth.signingIn")}
                </span>
              ) : (
                t("auth.signIn")
              )}
            </button>

            <p className="login-hint">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setResetStep("request");
                  setError(null);
                  setNotice(null);
                }}
              >
                {t("auth.forgot")}
              </a>
            </p>

            <div className="login-request">
              {t("auth.noAccount")}{" "}
              <a href={CONTACTS_URL} target="_blank" rel="noopener noreferrer">
                {t("auth.requestAccess")}
              </a>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
