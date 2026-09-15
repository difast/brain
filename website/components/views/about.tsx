import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { BreadcrumbJsonLd, FounderJsonLd } from "@/components/schema";
import { FOUNDER } from "@/components/founder";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const ABOUT_COPY = {
  ru: {
    metaTitle: "О проекте",
    metaDescription:
      "История и миссия Mevratek, команда, признание на форуме «Сильные идеи для нового времени 2026» (топ-36 из 48 478, оценка 3/3) и дорожная карта до 2027 года.",
    ogTitle: "О проекте Mevratek",
    crumb: "О проекте",
    missionEyebrow: "О проекте",
    missionTitle: "История и миссия",
    missionP1:
      "Mevratek вырос из простого наблюдения: после ухода западных облачных платформ российские команды, работающие с роботами, каждый раз строят инфраструктуру управления заново. Мы решили сделать её готовой утилитой.",
    missionP2:
      "Наша миссия — дать любой команде возможность подключить автономное устройство за день и управлять им через единый протокол на базе российских языковых моделей, не завися от конкретного производителя железа и зарубежных сервисов.",
    recogEyebrow: "Признание",
    recogTitle: "Форум «Сильные идеи для нового времени 2026»",
    recogStats: [
      ["Топ-36", "из 48 478 идей"],
      ["3 / 3", "оценка экспертов"],
      ["#1", "приоритетная поддержка"],
    ],
    expertLabel: "Заключение эксперта",
    quote:
      "«Один из наиболее проработанных и рыночно-ориентированных проектов среди рассмотренных».",
    scoreLabel: "Общая оценка",
    scoreValue: "3 / 3",
    recLabel: "Рекомендация",
    recValue: "К приоритетной поддержке",
    rankLabel: "Позиция в рейтинге",
    rankValue: "36 из 48 478",
    teamEyebrow: "Команда",
    teamTitle: "Кто делает Mevratek",
    founderName: FOUNDER.name,
    founderRole: FOUNDER.role,
    founderDetail: "Отвечает за продукт и развитие.",
    team: [
      ["Разработчик", "Бэкенд платформы, движок решений и интеграции."],
      ["Разработчик", "SDK, симулятор и клиентские инструменты."],
      [
        "Менеджер по продажам",
        "Работа с интеграторами, пилотные проекты и партнёрства.",
      ],
    ],
    roadmapEyebrow: "Дорожная карта",
    roadmapTitle: "Куда мы идём",
    roadmap: [
      [
        "Сейчас",
        "Платформа и SDK",
        "Движок решений, слой абстракции над железом, официальные SDK для пяти языков, MCP-коннектор и локальное развёртывание. Работает, обкатывается на пилотах.",
      ],
      [
        "2026",
        "Пилоты на реальном парке",
        "Внедрения у интеграторов и промышленных предприятий. Задача года — не число устройств, а сценарии, которые доходят до эксплуатации.",
      ],
      [
        "2026–2027",
        "Коробочная поставка Enterprise",
        "Единый инсталлятор, работа в air-gapped-среде, лицензирование и сопровождение — то, что нужно для внедрения в режимном контуре без нашего участия.",
      ],
    ],
    ctaTitle: "Хотите стать частью пилота?",
    ctaButton: "Связаться с командой",
  },
  en: {
    metaTitle: "About",
    metaDescription:
      "The story and mission behind Mevratek, the team, its recognition at the Strong Ideas for the New Times 2026 forum (top 36 of 48,478, scored 3/3), and the roadmap to 2027.",
    ogTitle: "About Mevratek",
    crumb: "About",
    missionEyebrow: "About",
    missionTitle: "The story and the mission",
    missionP1:
      "Mevratek grew out of one observation: after the Western cloud platforms left, every Russian team working with robots started building its control infrastructure again from scratch. We decided to make it an off-the-shelf utility instead.",
    missionP2:
      "Our mission is to let any team connect an autonomous device in a day and operate it through one protocol, with no dependence on a particular hardware manufacturer or on a foreign service.",
    recogEyebrow: "Recognition",
    recogTitle: "Strong Ideas for the New Times 2026",
    recogStats: [
      ["Top 36", "of 48,478 entries"],
      ["3 / 3", "expert score"],
      ["#1", "priority support"],
    ],
    expertLabel: "Expert assessment",
    quote:
      "“One of the most thoroughly developed and market-oriented projects we reviewed.”",
    scoreLabel: "Overall score",
    scoreValue: "3 / 3",
    recLabel: "Recommendation",
    recValue: "For priority support",
    rankLabel: "Position in the ranking",
    rankValue: "36 of 48,478",
    teamEyebrow: "Team",
    teamTitle: "Who builds Mevratek",
    founderName: FOUNDER.nameLatin,
    founderRole: "Founder",
    founderDetail: "Responsible for the product and its direction.",
    team: [
      ["Engineer", "The platform backend, the decision engine and integrations."],
      ["Engineer", "SDKs, the simulator and client tooling."],
      [
        "Sales manager",
        "Working with integrators, pilot projects and partnerships.",
      ],
    ],
    roadmapEyebrow: "Roadmap",
    roadmapTitle: "Where we are going",
    roadmap: [
      [
        "Now",
        "The platform and the SDKs",
        "The decision engine, the hardware abstraction layer, official SDKs for five languages, the MCP connector and a local deployment. Working and being proven on pilots.",
      ],
      [
        "2026",
        "Pilots on real fleets",
        "Rollouts with integrators and industrial enterprises. The measure for the year is not device count but the number of scenarios that reach day-to-day operation.",
      ],
      [
        "2026–2027",
        "The packaged Enterprise edition",
        "One installer, air-gapped operation, licensing and support — what a restricted perimeter needs in order to deploy without us in the room.",
      ],
    ],
    ctaTitle: "Want to be part of a pilot?",
    ctaButton: "Contact the team",
  },
} as const;

const FOUNDER_LINKS = [
  { label: "Telegram", href: FOUNDER.social.telegram },
  { label: "YouTube", href: FOUNDER.social.youtube },
  { label: "RUTUBE", href: FOUNDER.social.rutube },
  { label: "Instagram", href: FOUNDER.social.instagram },
];

export function AboutView({ locale }: { locale: Locale }) {
  const c = ABOUT_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/about") },
        ]}
      />
      <FounderJsonLd />
      {/* Mission */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading
              eyebrow={c.missionEyebrow}
              title={c.missionTitle}
            />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>{c.missionP1}</p>
              <p>{c.missionP2}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Recognition */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading eyebrow={c.recogEyebrow} title={c.recogTitle} />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="grid grid-cols-3 gap-4">
              {c.recogStats.map(([v, l]) => (
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
                  {c.expertLabel}
                </div>
                <div className="font-mono text-xs text-muted">№ 7184558990</div>
              </div>
              <blockquote className="mt-4 text-lg leading-relaxed text-ink">
                {c.quote}
              </blockquote>
              <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">{c.scoreLabel}</span>
                  <span className="font-semibold text-ink">{c.scoreValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">{c.recLabel}</span>
                  <span className="font-semibold text-signal">{c.recValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">{c.rankLabel}</span>
                  <span className="font-semibold text-ink">{c.rankValue}</span>
                </div>
              </div>
            </figure>
          </div>
        </Container>
      </Section>

      {/* Team */}
      <Section>
        <Container>
          <SectionHeading eyebrow={c.teamEyebrow} title={c.teamTitle} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-white p-6">
              <div className="text-base font-semibold text-ink">
                {c.founderName}
              </div>
              <div className="mt-0.5 text-sm text-muted">{c.founderRole}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {c.founderDetail}
              </p>
              <div className="mt-3 flex flex-col items-start gap-1">
                {FOUNDER_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="me noopener noreferrer"
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            {c.team.map(([role, detail], i) => (
              <div key={role + i} className="rounded-xl border border-line bg-white p-6">
                <div className="text-base font-semibold text-ink">{role}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Roadmap */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading eyebrow={c.roadmapEyebrow} title={c.roadmapTitle} />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {c.roadmap.map(([year, title, detail]) => (
              <div
                key={year}
                className="relative rounded-2xl border border-line bg-white p-7"
              >
                <div className="text-sm font-semibold text-accent">{year}</div>
                <div className="mt-2 text-xl font-semibold text-ink">{title}</div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center sm:py-14">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              {c.ctaTitle}
            </h2>
            <div className="mt-8 flex justify-center">
              <Button href={p("/contacts")} variant="secondary">
                {c.ctaButton} <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
