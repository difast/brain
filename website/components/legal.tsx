import type { ReactNode } from "react";
import { Container, Section } from "./ui";
import { COMPANY } from "./company";
import { defaultLocale, type Locale } from "@/i18n/config";

const LEGAL_COPY = {
  ru: {
    requisites: "Реквизиты оператора",
    name: "Наименование",
    ogrn: "ОГРН",
    inn: "ИНН",
    email: "Email",
    address: "Адрес",
    revision: "Редакция от",
  },
  en: {
    requisites: "Operator details",
    name: "Legal name",
    ogrn: "OGRN",
    inn: "INN",
    email: "Email",
    address: "Address",
    revision: "Revision of",
  },
} as const;

export function Requisites({ locale = defaultLocale }: { locale?: Locale } = {}) {
  const c = LEGAL_COPY[locale];
  return (
    <div className="rounded-xl border border-line bg-surface p-6 text-sm leading-relaxed">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {c.requisites}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted">{c.name}</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {locale === "ru" ? COMPANY.legalName : COMPANY.legalNameEn}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{c.ogrn}</dt>
          <dd className="mt-0.5 font-medium text-ink">{COMPANY.ogrn}</dd>
        </div>
        <div>
          <dt className="text-muted">{c.inn}</dt>
          <dd className="mt-0.5 font-medium text-ink">{COMPANY.inn}</dd>
        </div>
        <div>
          <dt className="text-muted">{c.email}</dt>
          <dd className="mt-0.5 font-medium text-ink">
            <a href={`mailto:${COMPANY.email}`} className="hover:text-accent">
              {COMPANY.email}
            </a>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">{c.address}</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {locale === "ru" ? COMPANY.address : COMPANY.addressEn}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * LegalDoc — читаемая типографика для юридических страниц без внешних плагинов.
 */
export function LegalDoc({
  title,
  updated,
  children,
  locale = defaultLocale,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  locale?: Locale;
}) {
  return (
    <Section className="pt-14 sm:pt-16">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {LEGAL_COPY[locale].revision} {updated}
          </p>

          <div
            className="mt-10 space-y-6 text-[15px] leading-relaxed text-ink-soft
              [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink
              [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink
              [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-muted
              [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5
              [&_a]:font-medium [&_a]:text-accent hover:[&_a]:text-ink"
          >
            {children}
          </div>
        </div>
      </Container>
    </Section>
  );
}
