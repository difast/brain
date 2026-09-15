import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { htmlLang, type Locale } from "@/i18n/config";

/**
 * The document both root layouts render.
 *
 * There are two root layouts — one per route group — because `<html lang>` can
 * only be set by a root layout, and the two languages need different values.
 * Everything inside them is identical apart from the locale, so it lives here
 * instead of being copy-pasted twice and drifting.
 */
export function RootShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <html lang={htmlLang[locale]}>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          {t(locale, "skipToContent")}
        </a>
        <OrganizationJsonLd locale={locale} />
        <WebSiteJsonLd locale={locale} />
        <SiteHeader locale={locale} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
