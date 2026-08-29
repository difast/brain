"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useSmartCaptcha } from "@/lib/captcha";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";

const CONTACTS_URL = "https://mevratek.ru/contacts";

export default function LoginPage() {
  const { t, lang, setLang } = useT();
  const { status, login } = useAuth();
  const { enabled: captchaEnabled, token: captchaToken, containerRef, reset } =
    useSmartCaptcha();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in → go to the dashboard.
  useEffect(() => {
    if (status === "authed") router.replace("/");
  }, [status, router]);

  async function submit(e: React.FormEvent) {
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
      await login(email.trim(), password, captchaToken);
      router.replace("/");
    } catch {
      // Backend returns a generic 401 for any bad credential. The captcha
      // token is single-use, so reset the widget for another attempt.
      setError(t("auth.invalid"));
      reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="login-card" onSubmit={submit}>
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
        <h1 className="login-title">{t("auth.title")}</h1>

        {error && <div className="error-box">{error}</div>}

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
      </form>
    </main>
  );
}
