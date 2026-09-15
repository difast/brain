import Link from "next/link";

import {
  ArrowIcon,
  Button,
  Card,
  Container,
  Section,
  SectionHeading,
  Stat,
} from "@/components/ui";
import { FlowDiagram } from "@/components/diagrams";
import { PLATFORM_COMPONENTS } from "@/components/content";
import { SoftwareApplicationJsonLd } from "@/components/schema";
import { localePath, type Locale } from "@/i18n/config";

export const HOME_COPY = {
  ru: {
    metaTitle: "Платформа управления роботами в вашем контуре",
    metaDescription:
      "Mevratek — российская платформа управления промышленными роботами и автономными устройствами. Разворачивается на вашей инфраструктуре: подключите устройство через единый SDK и получайте команды AI-движка.",
    badge: "Российская платформа · On-Premise · AI Decision Engine",
    h1: "Мозг для парка устройств — внутри вашего контура",
    lede:
      "Подключите промышленного робота, складскую тележку или симулятор через единый SDK. Передавайте телеметрию в реальном времени и получайте структурированные команды AI-движка на базе российских языковых моделей. Платформа разворачивается в инфраструктуре предприятия — данные не покидают периметр.",
    ctaPrimary: "Подключить устройство",
    ctaSecondary: "Как устроена платформа",
    proofEyebrow: "Признание экспертов",
    proofLead: (
      <>
        Топ-36 среди 48&nbsp;478 идей форума «Сильные идеи для нового времени
        2026».
      </>
    ),
    proofSub: "Оценка экспертов 3/3. Рекомендован к приоритетной поддержке.",
    proofQuote:
      "«Один из наиболее проработанных и рыночно-ориентированных проектов среди рассмотренных».",
    proofAuthor: "Заключение эксперта форума",
    problemEyebrow: "Проблема",
    problemTitle: "Западные платформы ушли — замены не появилось",
    problemBody:
      "Российские компании, работающие с роботами и автономными устройствами, лишились доступа к западным облачным платформам управления после 2022 года. Отечественных аналогов не существует: каждая команда вынуждена самостоятельно строить инфраструктуру управления, тратя месяцы на разработку того, что должно быть готовой утилитой.",
    problemStats: [
      ["152", "компании-интегратора в России"],
      ["21 000", "устройств в парке, +14% в год"],
      ["0", "готовых отечественных платформ"],
    ],
    problemSource: "Источник: НАУРР, Минпромторг, 2026.",
    solutionEyebrow: "Решение",
    solutionTitle: "Один протокол для любого железа",
    solutionIntro:
      "Mevratek — платформа, которая позволяет подключить любое автономное устройство через единый SDK и API, передавать телеметрию в реальном времени и получать структурированные команды AI-движка на базе российских языковых моделей. Платформа не привязана к производителю железа: один и тот же протокол работает с промышленным роботом, складской тележкой и симулятором. Поставляется как On-Premise-решение — сервер платформы работает на инфраструктуре заказчика.",
    stats: [
      ["1 день", "до подключения первого устройства"],
      ["5", "языков с официальным SDK: Python, JavaScript, Go, C++, C"],
      ["0", "внешних запросов в закрытом контуре"],
      ["152", "интегратора робототехники на рынке"],
    ],
    componentsEyebrow: "Компоненты",
    componentsTitle: "Из чего состоит платформа",
    componentsIntro:
      "Чистая слоистая архитектура: логические сервисы внутри единого разворачиваемого бэкенда.",
    linkPlatform: "Подробно о платформе",
    linkDocs: "Документация",
    linkBlog: "Блог",
    ctaTitle: "Подключите первое устройство за один день",
    ctaBody:
      "Расскажите о вашей задаче — предложим сценарий пилота, оценим контур развёртывания и поможем с интеграцией через SDK.",
    ctaFor: "Для кого платформа",
  },
  en: {
    metaTitle: "Robot fleet control inside your own perimeter",
    metaDescription:
      "Mevratek is a platform for controlling industrial robots and autonomous devices, deployed on your own infrastructure. Connect a device through one SDK and receive commands from the AI decision engine.",
    badge: "On-premise · AI decision engine · Built in Russia",
    h1: "A brain for your device fleet — inside your own perimeter",
    lede:
      "Connect an industrial robot, a warehouse cart or a simulator through one SDK. Stream telemetry in real time and receive structured commands from an AI engine running on the language model you choose. The platform is deployed on the enterprise's own infrastructure, so data never leaves the perimeter.",
    ctaPrimary: "Connect a device",
    ctaSecondary: "How the platform works",
    proofEyebrow: "Expert recognition",
    proofLead: (
      <>
        Top 36 of 48,478 entries at the Strong Ideas for the New Times 2026
        forum.
      </>
    ),
    proofSub:
      "A 3-out-of-3 expert score, and a recommendation for priority support.",
    proofQuote:
      "“One of the most thoroughly developed and market-oriented projects we reviewed.”",
    proofAuthor: "Forum expert assessment",
    problemEyebrow: "The problem",
    problemTitle: "The Western platforms left, and nothing replaced them",
    problemBody:
      "Russian companies working with robots and autonomous devices lost access to Western cloud control platforms after 2022. No domestic equivalent appeared, so every team builds its own control infrastructure, spending months on what ought to be an off-the-shelf utility.",
    problemStats: [
      ["152", "robotics integrators in Russia"],
      ["21,000", "devices in service, growing 14% a year"],
      ["0", "off-the-shelf domestic platforms"],
    ],
    problemSource: "Source: NAURR and the Ministry of Industry and Trade, 2026.",
    solutionEyebrow: "The solution",
    solutionTitle: "One protocol for any hardware",
    solutionIntro:
      "Mevratek lets you connect any autonomous device through a single SDK and API, stream telemetry in real time, and receive structured commands from an AI decision engine. Nothing is tied to a hardware vendor: the same protocol drives an industrial robot, a warehouse cart and a simulator. It ships as an on-premise product — the platform server runs on the customer's own infrastructure.",
    stats: [
      ["1 day", "to connect the first device"],
      ["5", "languages with an official SDK: Python, JavaScript, Go, C++, C"],
      ["0", "outbound requests in a closed perimeter"],
      ["152", "robotics integrators in the market"],
    ],
    componentsEyebrow: "Components",
    componentsTitle: "What the platform is made of",
    componentsIntro:
      "A clean layered architecture: logical services inside one deployable backend.",
    linkPlatform: "More about the platform",
    linkDocs: "Documentation",
    linkBlog: "Blog",
    ctaTitle: "Connect your first device in a day",
    ctaBody:
      "Tell us about your task and we will propose a pilot, size the deployment perimeter, and help with the SDK integration.",
    ctaFor: "Who it is for",
  },
} as const;

export function HomeView({ locale }: { locale: Locale }) {
  const c = HOME_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <SoftwareApplicationJsonLd locale={locale} />
      {/* Hero */}
      <Section className="pt-14 sm:pt-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                {c.badge}
              </div>
              <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.4rem]">
                {c.h1}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                {c.lede}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href={p("/contacts")}>
                  {c.ctaPrimary} <ArrowIcon />
                </Button>
                <Button href={p("/platform")} variant="secondary">
                  {c.ctaSecondary}
                </Button>
              </div>
            </div>

            <div className="lg:pl-4">
              <FlowDiagram locale={locale} />
            </div>
          </div>
        </Container>
      </Section>

      {/* Social proof */}
      <Section className="!py-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                  {c.proofEyebrow}
                </div>
                <p className="mt-3 text-lg font-medium leading-relaxed">
                  {c.proofLead}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {c.proofSub}
                </p>
              </div>
              <figure className="border-t border-white/15 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <blockquote className="text-lg leading-relaxed">
                  {c.proofQuote}
                </blockquote>
                <figcaption className="mt-3 text-sm text-white/60">
                  {c.proofAuthor}
                </figcaption>
              </figure>
            </div>
          </div>
        </Container>
      </Section>

      {/* Problem */}
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow={c.problemEyebrow} title={c.problemTitle} />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>{c.problemBody}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {c.problemStats.map(([v, l]) => (
                  <div key={l} className="rounded-xl border border-line bg-surface p-4">
                    <div className="text-2xl font-semibold text-ink">{v}</div>
                    <div className="mt-1 text-sm leading-snug text-muted">{l}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted">{c.problemSource}</p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Solution */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow={c.solutionEyebrow}
            title={c.solutionTitle}
            intro={c.solutionIntro}
          />
          <div className="mt-10">
            <FlowDiagram locale={locale} />
          </div>
        </Container>
      </Section>

      {/* Metrics */}
      <Section>
        <Container>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
            {c.stats.map(([v, l]) => (
              <Stat key={l} value={v} label={l} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Platform components */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow={c.componentsEyebrow}
            title={c.componentsTitle}
            intro={c.componentsIntro}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_COMPONENTS.map((comp) => (
              <Card key={comp.name} className="flex flex-col">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  {comp.role[locale]}
                </div>
                <div className="mt-1 text-base font-semibold text-ink">
                  {comp.name}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {comp.detail[locale]}
                </p>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
            <Link
              href={p("/platform")}
              className="inline-flex items-center gap-1.5 text-accent hover:text-ink"
            >
              {c.linkPlatform} <ArrowIcon />
            </Link>
            <Link href={p("/documentation")} className="text-accent hover:text-ink">
              {c.linkDocs}
            </Link>
            <Link href={p("/blog")} className="text-accent hover:text-ink">
              {c.linkBlog}
            </Link>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              {c.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              {c.ctaBody}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href={p("/contacts")} variant="secondary">
                {c.ctaPrimary} <ArrowIcon />
              </Button>
              <Button
                href={p("/for-who")}
                variant="secondary"
                className="!bg-transparent !text-white !ring-white/40 hover:!bg-white/10 hover:!ring-white/60"
              >
                {c.ctaFor}
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
