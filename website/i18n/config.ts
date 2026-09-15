/**
 * Locales, and why Russian has no prefix.
 *
 * Russian serves at the root — /platform, not /ru/platform — because those
 * URLs are already indexed, printed as a QR code on the conference handout,
 * and listed in llms.txt and the sitemap. Moving them behind a prefix would
 * 301 every one and throw the indexing away. English is the addition, so
 * English carries the prefix.
 *
 * There is deliberately no middleware. An earlier attempt routed both locales
 * through next-intl's middleware and worked in dev but broke in the
 * `output: standalone` build that actually ships — the default locale
 * redirected to itself and the prefixed one 500'd. Plain routes have no such
 * failure mode.
 */

export const locales = ["ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

/** BCP 47 tags for <html lang> and hreflang. */
export const htmlLang: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en",
};

/** A pair of translations for one string. */
export type Dict = Record<Locale, string>;

/** The path a locale serves a route at: /about, or /en/about. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === defaultLocale ? clean || "/" : `/en${clean}`;
}

/**
 * hreflang for one route, for both locales plus x-default.
 *
 * Spelled out per page rather than generated globally because Next needs the
 * languages map inside each page's own `alternates`.
 */
export function alternates(path: string) {
  return {
    canonical: localePath("ru", path),
    languages: {
      ru: localePath("ru", path),
      en: localePath("en", path),
      "x-default": localePath("ru", path),
    },
  };
}

/**
 * The same route in the other locale.
 *
 * Derives the pair from the URL rather than from a route table, so a page
 * added later is switchable the moment its English file exists — and a page
 * that has no English file still produces a URL that 404s visibly instead of
 * silently dropping the visitor on the home page.
 */
export function swapLocale(pathname: string, target: Locale): string {
  const bare =
    pathname === "/en"
      ? "/"
      : pathname.startsWith("/en/")
        ? pathname.slice(3)
        : pathname;
  return localePath(target, bare === "" ? "/" : bare);
}

/** Which locale a pathname belongs to. */
export function localeOf(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : defaultLocale;
}

/** localStorage key holding the visitor's explicit language choice. */
export const LANG_STORAGE_KEY = "mevratek.lang";
