"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

type Item = { href: string; key: string; hint?: string };

// Two light groups: operations, then developer tools.
const OPS: Item[] = [
  { href: "/", key: "nav.robots" },
  { href: "/connect", key: "nav.connect", hint: "nav.connect.hint" },
  { href: "/logs", key: "nav.logs" },
  { href: "/metrics", key: "nav.metrics" },
  { href: "/tasks", key: "nav.tasks" },
  { href: "/simulator", key: "nav.simulator", hint: "nav.simulator.hint" },
];
const DEV: Item[] = [
  { href: "/api", key: "nav.api" },
  { href: "/sdk", key: "nav.sdk" },
  { href: "/docs", key: "nav.docs" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/robots");
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavBar() {
  const { t, lang, setLang } = useT();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function renderLinks(items: Item[], mobile = false) {
    return items.map((item) => {
      const active = isActive(pathname, item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          title={item.hint ? t(item.hint) : undefined}
          aria-current={active ? "page" : undefined}
          className={`${mobile ? "nav-m-link" : "nav-link"}${active ? " active" : ""}`}
        >
          {t(item.key)}
        </Link>
      );
    });
  }

  return (
    <nav className="nav">
      <div className="nav-bar">
        <Link href="/" className="brand" style={{ color: "var(--text)" }}>
          ◎ Mevra<span>tek</span>
        </Link>

        <div className="nav-links">
          {renderLinks(OPS)}
          <span className="nav-sep" aria-hidden />
          {renderLinks(DEV)}
        </div>

        <div className="nav-right">
          <div className="lang-switch">
            <button
              className={lang === "ru" ? "active" : ""}
              onClick={() => setLang("ru")}
            >
              RU
            </button>
            <button
              className={lang === "en" ? "active" : ""}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
          {user && (
            <div className="nav-user">
              <Link
                href="/account"
                className="nav-user-email"
                title={t("nav.account")}
                aria-current={pathname === "/account" ? "page" : undefined}
              >
                {user.email}
              </Link>
              <button
                type="button"
                className="nav-logout"
                onClick={logout}
                title={t("auth.logout")}
              >
                {t("auth.logout")}
              </button>
            </div>
          )}
          <button
            type="button"
            className="nav-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("nav.close") : t("nav.menu")}
            aria-expanded={open}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="nav-mobile">
          <div className="nav-m-group">{renderLinks(OPS, true)}</div>
          <div className="nav-m-divider" />
          <div className="nav-m-group">{renderLinks(DEV, true)}</div>
          {user && (
            <>
              <div className="nav-m-divider" />
              <div className="nav-m-group">
                <span className="nav-m-email">{user.email}</span>
                <Link
                  href="/account"
                  className={`nav-m-link${pathname === "/account" ? " active" : ""}`}
                  aria-current={pathname === "/account" ? "page" : undefined}
                >
                  {t("nav.account")}
                </Link>
                <button
                  type="button"
                  className="nav-m-link nav-m-logout"
                  onClick={logout}
                >
                  {t("auth.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
