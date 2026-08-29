import type { Metadata } from "next";
import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "О проекте",
  description:
    "История и миссия Mevratek, команда, признание на форуме «Сильные идеи для нового времени 2026» (топ-36 из 48 478, оценка 3/3) и дорожная карта до 2027 года.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "О проекте Mevratek",
    description:
      "Миссия, команда, признание экспертов и дорожная карта отечественной платформы управления роботами.",
    url: "/about",
  },
};

const TEAM = [
  {
    role: "Основатель",
    detail:
      "Серийный предприниматель. Запустил OneOnOne и Техфабрику. Отвечает за продукт и развитие.",
  },
  { role: "Разработчик", detail: "Бэкенд платформы, движок решений и интеграции." },
  { role: "Разработчик", detail: "SDK, симулятор и клиентские инструменты." },
  {
    role: "Менеджер по продажам",
    detail: "Работа с интеграторами, пилотные проекты и партнёрства.",
  },
];

const ROADMAP = [
  {
    year: "2026",
    title: "50 подключённых устройств",
    detail:
      "Пилоты с интеграторами и промышленными предприятиями, обкатка сценариев и SDK на реальном парке.",
  },
  {
    year: "2027",
    title: "500 устройств · отраслевой стандарт",
    detail:
      "Масштабирование до 500 устройств и становление единым протоколом управления автономными устройствами в России.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Mission */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow="О проекте" title="История и миссия" />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>
                Mevratek вырос из простого наблюдения: после ухода западных
                облачных платформ российские команды, работающие с роботами,
                каждый раз строят инфраструктуру управления заново. Мы решили
                сделать её готовой утилитой.
              </p>
              <p>
                Наша миссия — дать любой команде возможность подключить
                автономное устройство за день и управлять им через единый протокол
                на базе российских языковых моделей, не завися от конкретного
                производителя железа и зарубежных сервисов.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Recognition */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Признание"
            title="Форум «Сильные идеи для нового времени 2026»"
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="grid grid-cols-3 gap-4">
              {[
                ["Топ-36", "из 48 478 идей"],
                ["3 / 3", "оценка экспертов"],
                ["#1", "приоритетная поддержка"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  className="flex flex-col justify-between rounded-xl border border-line bg-white p-5"
                >
                  <div className="text-2xl font-semibold text-ink">{v}</div>
                  <div className="mt-2 text-xs leading-snug text-muted">{l}</div>
                </div>
              ))}
            </div>

            {/* Expert conclusion */}
            <figure className="rounded-2xl border border-line bg-white p-7">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Заключение эксперта
                </div>
                <div className="font-mono text-xs text-muted">№ 7184558990</div>
              </div>
              <blockquote className="mt-4 text-lg leading-relaxed text-ink">
                «Один из наиболее проработанных и рыночно-ориентированных проектов
                среди рассмотренных».
              </blockquote>
              <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Общая оценка</span>
                  <span className="font-semibold text-ink">3 / 3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Рекомендация</span>
                  <span className="font-semibold text-signal">
                    К приоритетной поддержке
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Позиция в рейтинге</span>
                  <span className="font-semibold text-ink">36 из 48 478</span>
                </div>
              </div>
            </figure>
          </div>
        </Container>
      </Section>

      {/* Team */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Команда" title="Кто делает Mevratek" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((m, i) => (
              <div
                key={m.role + i}
                className="rounded-xl border border-line bg-white p-6"
              >
                <div className="text-base font-semibold text-ink">{m.role}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {m.detail}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Roadmap */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading eyebrow="Дорожная карта" title="Куда мы идём" />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {ROADMAP.map((r) => (
              <div
                key={r.year}
                className="relative rounded-2xl border border-line bg-white p-7"
              >
                <div className="text-sm font-semibold text-accent">{r.year}</div>
                <div className="mt-2 text-xl font-semibold text-ink">
                  {r.title}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {r.detail}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center sm:py-14">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Хотите стать частью пилота?
            </h2>
            <div className="mt-8 flex justify-center">
              <Button href="/contacts" variant="secondary">
                Связаться с командой <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
