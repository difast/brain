import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container, ArrowIcon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/platform", label: "Платформа", sub: "Архитектура и AI-движок" },
  { href: "/for-who", label: "Для кого", sub: "Сценарии применения" },
  { href: "/about", label: "О проекте", sub: "Команда и признание" },
  { href: "/contacts", label: "Контакты", sub: "Подключить устройство" },
];

export default function NotFound() {
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
        Ошибка 404
      </div>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        Такой страницы нет
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
        Возможно, ссылка устарела или содержит опечатку. Устройство не сбилось с
        курса — просто эта цель не найдена.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/">
          На главную <ArrowIcon />
        </Button>
        <Button href="/contacts" variant="secondary">
          Связаться с нами
        </Button>
      </div>

      <div className="mt-14 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between rounded-xl border border-line bg-white px-5 py-4 text-left transition-colors hover:border-accent/40 hover:bg-surface"
          >
            <span>
              <span className="block text-sm font-semibold text-ink">
                {l.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{l.sub}</span>
            </span>
            <ArrowIcon className="text-muted transition-colors group-hover:text-accent" />
          </Link>
        ))}
      </div>
    </Container>
  );
}
