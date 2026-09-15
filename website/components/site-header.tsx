"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "./logo";
import { Button } from "./ui";
import { LangSwitch } from "./lang-switch";
import { NAV, t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const contacts = localePath(locale, "/contacts");

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo locale={locale} />

        <nav className="hidden items-center gap-5 lg:gap-6 md:flex">
          {NAV.map((item) => {
            const href = localePath(locale, item.href);
            const active = pathname === href;
            return (
              <Link
                key={item.href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {item.label[locale]}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LangSwitch locale={locale} />
          <Button href={contacts} variant="primary" className="!px-4 !py-2">
            {t(locale, "ctaConnect")}
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LangSwitch locale={locale} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink"
            aria-label={t(locale, open ? "closeMenu" : "openMenu")}
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

      {open ? (
        <div className="border-t border-line bg-white md:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={localePath(locale, item.href)}
                className="rounded-lg px-2 py-3 text-base font-medium text-ink hover:bg-surface"
              >
                {item.label[locale]}
              </Link>
            ))}
            <Button href={contacts} variant="primary" className="mt-3 w-full">
              {t(locale, "ctaConnect")}
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
