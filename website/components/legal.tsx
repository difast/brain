import type { ReactNode } from "react";
import { Container, Section } from "./ui";
import { COMPANY } from "./company";

export function Requisites() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 text-sm leading-relaxed">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Реквизиты оператора
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-muted">Наименование</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {COMPANY.legalName} (бренд «{COMPANY.brand}»)
          </dd>
        </div>
        <div>
          <dt className="text-muted">ОГРН</dt>
          <dd className="mt-0.5 font-medium text-ink">{COMPANY.ogrn}</dd>
        </div>
        <div>
          <dt className="text-muted">ИНН</dt>
          <dd className="mt-0.5 font-medium text-ink">{COMPANY.inn}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="mt-0.5 font-medium text-ink">
            <a href={`mailto:${COMPANY.email}`} className="hover:text-accent">
              {COMPANY.email}
            </a>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Адрес</dt>
          <dd className="mt-0.5 font-medium text-ink">{COMPANY.address}</dd>
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
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Section className="pt-14 sm:pt-16">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted">Редакция от {updated}</p>

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
