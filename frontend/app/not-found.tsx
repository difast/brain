import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена — Mevratek",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", label: "Устройства", sub: "Парк и статус в реальном времени" },
  { href: "/logs", label: "Логи решений", sub: "Все решения мозга" },
  { href: "/tasks", label: "Задачи", sub: "Назначение и очередь" },
  { href: "/docs", label: "Документация", sub: "Протокол и эндпоинты" },
];

export default function NotFound() {
  return (
    <main className="nf">
      <svg viewBox="0 0 120 120" className="nf-mark" fill="none" aria-hidden>
        <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="2" />
        <circle cx="60" cy="60" r="30" stroke="currentColor" strokeWidth="2" />
        <circle cx="52" cy="52" r="7" className="nf-dot" />
      </svg>

      <div className="nf-eyebrow">Ошибка 404</div>
      <h1 className="nf-title">Такой страницы нет</h1>
      <p className="nf-text">
        Возможно, ссылка устарела или содержит опечатку. Устройство не сбилось с
        курса — просто эта цель не найдена.
      </p>

      <div className="nf-actions">
        <Link href="/" className="nf-btn nf-btn-primary">
          На главную
        </Link>
        <Link href="/docs" className="nf-btn nf-btn-secondary">
          Документация
        </Link>
      </div>

      <div className="nf-links">
        {LINKS.map((l) => (
          <Link key={l.href + l.label} href={l.href} className="nf-link">
            <span>
              <span className="nf-link-title">{l.label}</span>
              <span className="nf-link-sub">{l.sub}</span>
            </span>
            <span className="nf-arrow" aria-hidden>
              →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
