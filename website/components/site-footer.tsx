import Link from "next/link";

import { Logo } from "./logo";
import { COMPANY } from "./company";
import { FOOTER_COLUMNS, t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="relative z-10 -mt-8 rounded-t-[72px] border-t border-line bg-footer shadow-[0_-10px_30px_-18px_rgba(20,23,28,0.22)]">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.9fr_1.1fr]">
          <div className="max-w-sm">
            <Logo locale={locale} />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t(locale, "footerBlurb")}
            </p>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title.ru}>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {col.title[locale]}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label.ru}>
                    <Link
                      href={localePath(locale, l.href)}
                      className="text-sm text-ink-soft transition-colors hover:text-accent"
                    >
                      {l.label[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6 text-sm text-muted">
          <p className="leading-relaxed">
            {locale === "ru" ? COMPANY.legalName : COMPANY.legalNameEn} · ОГРН{" "}
            {COMPANY.ogrn} · ИНН {COMPANY.inn}
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            {locale === "ru" ? COMPANY.address : COMPANY.addressEn}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} Mevratek. {t(locale, "rights")}
            </span>
            <span>{t(locale, "madeIn")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
