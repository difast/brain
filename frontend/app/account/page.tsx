"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useFeedback } from "@/components/feedback";
import { api, errorMessage } from "@/lib/api";
import { PasswordInput } from "@/components/PasswordInput";
import { Spinner } from "@/components/ui";
import { AvatarCropper } from "@/components/AvatarCropper";

function Avatar({ email, src, size = 64 }: { email: string; src: string | null; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", width: size, height: size }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-strong)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
      aria-hidden
    >
      {email.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AccountPage() {
  const { t, lang } = useT();
  const { user, organization, refreshUser } = useAuth();
  const { toast } = useFeedback();

  // Whether changes have to be confirmed by a code from an email.
  const [codeRequired, setCodeRequired] = useState(false);
  useEffect(() => {
    api
      .config()
      .then((c) => setCodeRequired(c.email_confirmation))
      .catch(() => setCodeRequired(false));
  }, []);

  // Password change
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwCode, setPwCode] = useState("");
  const [pwCodeSent, setPwCodeSent] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Email change
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // Newsletter consent. Held locally so the checkbox responds to the click
  // immediately instead of waiting for the round-trip; reverted if it fails.
  const [mailBusy, setMailBusy] = useState(false);
  const [optIn, setOptIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (user) setOptIn(user.newsletter_opt_in);
  }, [user]);

  if (!user || !organization) return null;

  const roleLabel = user.role === "admin" ? t("admin.roleAdmin") : t("admin.roleMember");
  const memberSince = new Date(user.created_at).toLocaleDateString(
    lang === "ru" ? "ru-RU" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (next.length < 6) {
      setPwError(t("account.tooShort"));
      return;
    }
    if (next !== confirm) {
      setPwError(t("account.mismatch"));
      return;
    }
    setPwBusy(true);
    try {
      // With email confirmation on, the first submit only asks for a code.
      if (codeRequired && !pwCodeSent) {
        await api.requestPasswordCode(current);
        setPwCodeSent(true);
        toast(t("account.codeSent"), "success");
        return;
      }
      await api.changePassword(current, next, pwCode || undefined);
      toast(t("account.changed"), "success");
      setCurrent("");
      setNext("");
      setConfirm("");
      setPwCode("");
      setPwCodeSent(false);
    } catch (e) {
      setPwError(errorMessage(e, t("account.changeFailed")));
    } finally {
      setPwBusy(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailBusy(true);
    try {
      if (codeRequired && !emailCodeSent) {
        await api.requestEmailCode(emailPassword, newEmail);
        setEmailCodeSent(true);
        toast(t("account.codeSentToNew"), "success");
        return;
      }
      await api.changeEmail(emailPassword, newEmail, emailCode || undefined);
      await refreshUser();
      toast(t("account.emailChanged"), "success");
      setEmailPassword("");
      setNewEmail("");
      setEmailCode("");
      setEmailCodeSent(false);
    } catch (e) {
      setEmailError(errorMessage(e, t("account.changeFailed")));
    } finally {
      setEmailBusy(false);
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) setPendingFile(file);
  }

  async function saveAvatar(dataUrl: string) {
    setAvatarBusy(true);
    try {
      await api.updateAvatar(dataUrl);
      await refreshUser();
      toast(t("account.avatarChanged"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setAvatarBusy(false);
      setPendingFile(null);
    }
  }

  async function toggleNewsletter(optedIn: boolean) {
    setMailBusy(true);
    setOptIn(optedIn);
    try {
      await api.setNewsletterOptIn(optedIn);
      await refreshUser();
      toast(
        optedIn ? t("account.mailOptedIn") : t("account.mailOptedOut"),
        "success",
      );
    } catch (e) {
      setOptIn(!optedIn);
      toast(errorMessage(e, t("account.changeFailed")), "error");
    } finally {
      setMailBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      await api.updateAvatar(null);
      await refreshUser();
      toast(t("account.avatarRemoved"), "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>{t("account.title")}</h1>
      <p className="sub">{t("account.sub")}</p>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("account.avatar")}</h2>
        <div className="row" style={{ alignItems: "center", gap: 16 }}>
          <Avatar email={user.email} src={user.avatar} />
          <div className="row" style={{ gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileSelected}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
            >
              {avatarBusy ? <Spinner /> : t("account.avatarUpload")}
            </button>
            {user.avatar && (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={avatarBusy}
                style={{
                  background: "transparent",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("account.avatarRemove")}
              </button>
            )}
          </div>
        </div>
      </div>

      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onSave={saveAvatar}
        />
      )}

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

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("account.changeEmail")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("account.changeEmailHint")}
        </p>

        {emailError && <div className="error-box">{emailError}</div>}

        <form onSubmit={submitEmail} style={{ maxWidth: 360, marginTop: 4 }}>
          <label htmlFor="acc-email-new">{t("account.newEmail")}</label>
          <input
            id="acc-email-new"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ width: "100%" }}
            required
          />

          <label htmlFor="acc-email-password">{t("account.currentPassword")}</label>
          <PasswordInput
            id="acc-email-password"
            value={emailPassword}
            onChange={setEmailPassword}
            autoComplete="current-password"
          />

          {emailCodeSent && (
            <>
              <label htmlFor="acc-email-code">{t("account.code")}</label>
              <input
                id="acc-email-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                placeholder="12345"
                style={{ width: "100%", fontFamily: "var(--mono)", letterSpacing: 4 }}
              />
            </>
          )}

          <button
            type="submit"
            disabled={
              emailBusy ||
              !newEmail ||
              !emailPassword ||
              (emailCodeSent && !emailCode)
            }
            style={{ marginTop: 16 }}
          >
            {emailBusy ? (
              <Spinner />
            ) : codeRequired && !emailCodeSent ? (
              t("account.sendCode")
            ) : (
              t("account.save")
            )}
          </button>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("account.changePassword")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("account.changePasswordHint")}
        </p>

        {pwError && <div className="error-box">{pwError}</div>}

        <form onSubmit={submitPassword} style={{ maxWidth: 360, marginTop: 4 }}>
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

          {pwCodeSent && (
            <>
              <label htmlFor="acc-pw-code">{t("account.code")}</label>
              <input
                id="acc-pw-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={pwCode}
                onChange={(e) => setPwCode(e.target.value.replace(/\D/g, ""))}
                placeholder="12345"
                style={{ width: "100%", fontFamily: "var(--mono)", letterSpacing: 4 }}
              />
            </>
          )}

          <button
            type="submit"
            disabled={
              pwBusy || !current || !next || !confirm || (pwCodeSent && !pwCode)
            }
            style={{ marginTop: 16 }}
          >
            {pwBusy ? (
              <Spinner />
            ) : codeRequired && !pwCodeSent ? (
              t("account.sendCode")
            ) : (
              t("account.save")
            )}
          </button>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("account.mail")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("account.mailHint")}
        </p>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            margin: "10px 0 0",
            color: "var(--text)",
            fontSize: 13,
            cursor: mailBusy ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={optIn ?? user.newsletter_opt_in}
            disabled={mailBusy}
            onChange={(e) => toggleNewsletter(e.target.checked)}
            style={{ width: 16, height: 16, marginTop: 1, padding: 0 }}
          />
          <span>{t("account.mailConsent")}</span>
        </label>
      </div>

      <div className="panel">
        <h2>{t("account.activity")}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {t("account.activityHint")}
        </p>
        <Link href="/account/activity" className="nav-logout" style={{ display: "inline-block", marginTop: 4 }}>
          {t("account.activityOpen")}
        </Link>
      </div>
    </main>
  );
}
