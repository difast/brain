"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  LANG_STORAGE_KEY,
  locales,
  localeOf,
  swapLocale,
  type Locale,
} from "@/i18n/config";
import { t } from "@/content/ui";

/** Remembers the choice; ignored where storage is blocked. */
function remember(locale: Locale) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, locale);
  } catch {
    /* private mode — the switcher still works, it just does not persist */
  }
}

function recall(): Locale | null {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    return v === "ru" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Sends a visitor to their language once per visit.
 *
 * Runs in the browser rather than in middleware on purpose: the site ships as
 * an `output: standalone` build where middleware-driven locale routing broke
 * (see i18n/config.ts), and a redirect done here cannot take the Russian URLs
 * — the ones that are actually indexed — down with it if it misfires.
 *
 * It fires at most once per tab, so a visitor who deliberately opens a Russian
 * URL after switching to English is not yanked back.
 */
function useLocalePreference(current: Locale) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = recall();
    if (stored) {
      if (stored !== current) router.replace(swapLocale(pathname, stored));
      return;
    }
    // No explicit choice yet: guess from the browser, but only the first time
    // a tab loads the site, and only away from Russian — an English speaker
    // landing on Russian is stuck, a Russian speaker landing on Russian is not.
    try {
      if (window.sessionStorage.getItem("mevratek.lang.auto")) return;
      window.sessionStorage.setItem("mevratek.lang.auto", "1");
    } catch {
      return;
    }
    if (current !== "ru") return;
    const prefers = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    const wantsRussian = prefers.some((l) =>
      /^(ru|be|kk|ky|uz|tg|hy|az)\b/i.test(l),
    );
    if (!wantsRussian) router.replace(swapLocale(pathname, "en"));
  }, [current, pathname, router]);
}

const LABEL: Record<Locale, string> = { ru: "RU", en: "EN" };

export function LangSwitch({
  locale,
  className = "",
}: {
  locale: Locale;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";
  // The URL is the source of truth, not the prop: the shell is rendered once
  // per route group, so on a client-side navigation the path changes before
  // the prop would.
  const current = localeOf(pathname);
  useLocalePreference(current);

  return (
    <div
      className={`flex items-center rounded-lg border border-line bg-white p-0.5 ${className}`}
      role="group"
      aria-label={t(locale, "language")}
    >
      {locales.map((l) => {
        const active = l === current;
        return (
          <Link
            key={l}
            href={swapLocale(pathname, l)}
            hrefLang={l}
            onClick={() => remember(l)}
            aria-current={active ? "true" : undefined}
            className={`rounded-[6px] px-2 py-1 text-xs font-semibold tracking-wide transition-colors ${
              active
                ? "bg-surface text-ink"
                : "text-muted hover:text-ink"
            }`}
          >
            {LABEL[l]}
          </Link>
        );
      })}
    </div>
  );
}
