"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useSmartCaptcha } from "@/lib/captcha";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { UnauthorizedError, errorMessage } from "@/lib/api";

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
    setCode("");
    setError(null);
    setPassword("");
    reset();
  }

  return (
    <main className="login-wrap">
      <form
        className="login-card"
        onSubmit={challenge ? submitCode : submitPassword}
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
          {challenge ? t("auth.codeTitle") : t("auth.title")}
        </h1>

        {error && <div className="error-box">{error}</div>}

        {challenge ? (
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

            <p className="login-hint">{t("auth.forgot")}</p>

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
