import Link from "next/link";
import { Logo } from "./logo";
import { COMPANY } from "./company";

const COLUMNS = [
  {
    title: "Продукт",
    links: [
      { href: "/platform", label: "Платформа" },
      { href: "/protocol", label: "Mevratek Protocol" },
      { href: "/on-premise", label: "On-Premise" },
      { href: "/documentation", label: "Документация" },
      { href: "/platform#simulator", label: "Симулятор" },
    ],
  },
  {
    title: "Компания",
    links: [
      { href: "/about", label: "О проекте" },
      { href: "/for-who", label: "Для кого" },
      { href: "/blog", label: "Блог" },
      { href: "/contacts", label: "Контакты" },
    ],
  },
  {
    title: "Документы",
    links: [
      { href: "/privacy", label: "Политика конфиденциальности" },
      { href: "/consent", label: "Согласие на обработку ПД" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 -mt-8 rounded-t-[72px] border-t border-line bg-footer shadow-[0_-10px_30px_-18px_rgba(20,23,28,0.22)]">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Российская платформа управления промышленными роботами и
              автономными устройствами. Единый SDK, телеметрия в реальном времени
              и структурированные команды AI-движка. Разворачивается в контуре
              заказчика.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-soft transition-colors hover:text-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6 text-sm text-muted">
          <p className="leading-relaxed">
            {COMPANY.legalName} · ОГРН {COMPANY.ogrn} · ИНН {COMPANY.inn}
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            {COMPANY.address}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Mevratek. Все права защищены.</span>
            <span>Сделано в России · AI Decision Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
