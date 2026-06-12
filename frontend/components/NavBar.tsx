"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function NavBar() {
  const { t, lang, setLang } = useT();
  return (
    <nav className="nav">
      <Link href="/" className="brand" style={{ color: "var(--text)" }}>
        ◎ Mevra<span>tek</span>
      </Link>
      <Link href="/">{t("nav.robots")}</Link>
      <Link href="/logs">{t("nav.logs")}</Link>
      <Link href="/tasks">{t("nav.tasks")}</Link>
      <Link href="/simulator">{t("nav.simulator")}</Link>
      <Link href="/api">{t("nav.api")}</Link>
      <Link href="/sdk">{t("nav.sdk")}</Link>
      <Link href="/docs">{t("nav.docs")}</Link>
      <div className="lang-switch" style={{ marginLeft: "auto" }}>
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
    </nav>
  );
}
