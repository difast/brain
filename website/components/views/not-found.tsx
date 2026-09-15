import Link from "next/link";

import { Button, Container, ArrowIcon } from "@/components/ui";
import { localePath, type Locale } from "@/i18n/config";

export const NOT_FOUND_COPY = {
  ru: {
    metaTitle: "Страница не найдена",
    code: "Ошибка 404",
    title: "Такой страницы нет",
    body:
      "Возможно, ссылка устарела или содержит опечатку. Устройство не сбилось с курса — просто эта цель не найдена.",
    home: "На главную",
    contact: "Связаться с нами",
    links: [
      ["/platform", "Платформа", "Архитектура и AI-движок"],
      ["/for-who", "Для кого", "Сценарии применения"],
      ["/about", "О проекте", "Команда и признание"],
      ["/contacts", "Контакты", "Подключить устройство"],
    ],
  },
  en: {
    metaTitle: "Page not found",
    code: "Error 404",
    title: "There is no such page",
    body:
      "The link may be out of date or contain a typo. The device has not gone off course — this particular target just does not exist.",
    home: "Go to the home page",
    contact: "Get in touch",
    links: [
      ["/platform", "Platform", "Architecture and the AI engine"],
      ["/for-who", "Who it's for", "Where it is used"],
      ["/about", "About", "The team and the recognition"],
      ["/contacts", "Contact", "Connect a device"],
    ],
  },
} as const;

export function NotFoundView({ locale }: { locale: Locale }) {
  const c = NOT_FOUND_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="relative flex items-center justify-center">
        {/* Bullseye mark echoing the logo, "misaligned" as a subtle 404 metaphor */}
        <svg
          viewBox="0 0 120 120"
          className="h-28 w-28 text-line"
          fill="none"
          aria-hidden
        >
          <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="2" />
          <circle cx="60" cy="60" r="30" stroke="currentColor" strokeWidth="2" />
          <circle cx="52" cy="52" r="7" className="fill-accent-strong" />
        </svg>
      </div>

      <div className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
        {c.code}
      </div>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{c.title}</h1>
      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
        {c.body}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href={p("/")}>
          {c.home} <ArrowIcon />
        </Button>
        <Button href={p("/contacts")} variant="secondary">
          {c.contact}
        </Button>
      </div>

      <div className="mt-14 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {c.links.map(([href, label, sub]) => (
          <Link
            key={href}
            href={p(href)}
            className="group flex items-center justify-between rounded-xl border border-line bg-white px-5 py-4 text-left transition-colors hover:border-accent/40 hover:bg-surface"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="mt-0.5 block text-xs text-muted">{sub}</span>
            </span>
            <ArrowIcon className="text-muted transition-colors group-hover:text-accent" />
          </Link>
        ))}
      </div>
    </Container>
  );
}
