"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, type AuthUser } from "@/lib/api";
import { useFeedback } from "@/components/feedback";
import { Panel } from "@/components/account/shared";
import { useT } from "@/lib/i18n";

/** One consent checkbox. Optimistic, so the box responds to the click. */
function Consent({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        margin: "10px 0 0",
        color: "var(--text)",
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, marginTop: 1, padding: 0 }}
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * Which optional mail this account receives.
 *
 * Both toggles are optimistic — the box flips at once and reverts if the
 * server refuses — because waiting for a round-trip makes a checkbox feel
 * broken.
 */
export function MailPrefsPanel({
  user,
  onChanged,
}: {
  user: AuthUser;
  onChanged: () => Promise<void>;
}) {
  const { t } = useT();
  const { toast } = useFeedback();

  const [newsletter, setNewsletter] = useState(user.newsletter_opt_in);
  const [alerts, setAlerts] = useState(user.alerts_opt_in);
  const [busy, setBusy] = useState<"newsletter" | "alerts" | null>(null);

  useEffect(() => {
    setNewsletter(user.newsletter_opt_in);
    setAlerts(user.alerts_opt_in);
  }, [user]);

  async function toggleNewsletter(next: boolean) {
    setBusy("newsletter");
    setNewsletter(next);
    try {
      await api.setNewsletterOptIn(next);
      await onChanged();
      toast(next ? t("account.mailOptedIn") : t("account.mailOptedOut"), "success");
    } catch (e) {
      setNewsletter(!next);
      toast(errorMessage(e, t("account.changeFailed")), "error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAlerts(next: boolean) {
    setBusy("alerts");
    setAlerts(next);
    try {
      await api.setAlertsOptIn(next);
      await onChanged();
      toast(
        next ? t("account.alertsOptedIn") : t("account.alertsOptedOut"),
        "success",
      );
    } catch (e) {
      setAlerts(!next);
      toast(errorMessage(e, t("account.changeFailed")), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel title={t("account.mail")} hint={t("account.mailHint")}>
      <Consent
        checked={newsletter}
        disabled={busy === "newsletter"}
        label={t("account.mailConsent")}
        onChange={toggleNewsletter}
      />
      <Consent
        checked={alerts}
        disabled={busy === "alerts"}
        label={t("account.alertsConsent")}
        onChange={toggleAlerts}
      />
    </Panel>
  );
}
