"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AvatarPanel } from "@/components/account/AvatarPanel";
import { ProfilePanel } from "@/components/account/ProfilePanel";
import { OrganizationPanel } from "@/components/account/OrganizationPanel";
import { EmailPanel } from "@/components/account/EmailPanel";
import { PasswordPanel } from "@/components/account/PasswordPanel";
import {
  SessionsPanel,
  type SessionsHandle,
} from "@/components/account/SessionsPanel";
import { MailPrefsPanel } from "@/components/account/MailPrefsPanel";
import { ApiKeysPanel } from "@/components/account/ApiKeysPanel";
import { DangerPanel } from "@/components/account/DangerPanel";
import { Panel } from "@/components/account/shared";
import { TeamPanel } from "@/components/TeamPanel";

/**
 * The account page is a composition, not a component: each panel owns its own
 * state and talks to the API itself. Nine panels is too many for one screen, so
 * they are grouped into tabs, and the tab is kept in the URL hash so a link can
 * point straight at one.
 */
const TABS = ["profile", "security", "team", "developer"] as const;
type Tab = (typeof TABS)[number];

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "profile";
  const hash = window.location.hash.replace("#", "");
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : "profile";
}

export default function AccountPage() {
  const { t } = useT();
  const { user, organization, refreshUser } = useAuth();

  const [tab, setTab] = useState<Tab>("profile");
  useEffect(() => {
    setTab(tabFromHash());
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Whether changes have to be confirmed by a code from an email.
  const [codeRequired, setCodeRequired] = useState(false);
  useEffect(() => {
    api
      .config()
      .then((c) => setCodeRequired(c.email_confirmation))
      .catch(() => setCodeRequired(false));
  }, []);

  // A password change signs other devices out, so that panel tells this one.
  const sessionsRef = useRef<SessionsHandle>(null);

  if (!user || !organization) return null;

  function select(next: Tab) {
    setTab(next);
    // replaceState rather than a hash assignment: no scroll jump.
    window.history.replaceState(null, "", `#${next}`);
  }

  return (
    <main className="container">
      <h1>{t("account.title")}</h1>
      <p className="sub">{t("account.sub")}</p>

      <div className="toolbar">
        <div className="chips">
          {TABS.map((id) => (
            <button
              key={id}
              className={`filter-chip${tab === id ? " active" : ""}`}
              onClick={() => select(id)}
            >
              {t(`account.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "profile" && (
        <>
          <AvatarPanel user={user} onChanged={refreshUser} />
          <ProfilePanel user={user} organizationName={organization.name} />
          <OrganizationPanel
            canManage={user.role === "admin"}
            onRenamed={refreshUser}
          />
          <MailPrefsPanel user={user} onChanged={refreshUser} />
        </>
      )}

      {tab === "security" && (
        <>
          <EmailPanel codeRequired={codeRequired} onChanged={refreshUser} />
          <PasswordPanel
            codeRequired={codeRequired}
            onChanged={async () => {
              await sessionsRef.current?.reload();
            }}
          />
          <SessionsPanel ref={sessionsRef} />

          <Panel title={t("account.activity")} hint={t("account.activityHint")}>
            <Link
              href="/account/activity"
              className="nav-logout"
              style={{ display: "inline-block", marginTop: 4 }}
            >
              {t("account.activityOpen")}
            </Link>
          </Panel>

          <DangerPanel codeRequired={codeRequired} />
        </>
      )}

      {tab === "team" && <TeamPanel currentUserId={user.id} />}

      {tab === "developer" && <ApiKeysPanel />}
    </main>
  );
}
