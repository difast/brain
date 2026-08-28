import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Продукт",
    links: [
      { href: "/platform", label: "Платформа" },
      { href: "/platform#simulator", label: "Симулятор" },
      { href: "/platform#models", label: "AI-модели" },
    ],
  },
  {
    title: "Компания",
    links: [
      { href: "/about", label: "О проекте" },
      { href: "/for-who", label: "Для кого" },
      { href: "/contacts", label: "Контакты" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Российская облачная платформа управления промышленными роботами и
              автономными устройствами. Единый SDK, телеметрия в реальном времени
              и структурированные команды от AI-движка.
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

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Mevratek. Все права защищены.</span>
          <span>Сделано в России · AI Decision Engine</span>
        </div>
      </div>
    </footer>
  );
}
