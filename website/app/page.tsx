import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Платформа управления роботами в вашем контуре",
  description:
    "Mevratek — российская платформа управления промышленными роботами и автономными устройствами. Разворачивается на вашей инфраструктуре: подключите устройство через единый SDK и получайте команды AI-движка.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      {/* Hero */}
      <Section className="pt-14 sm:pt-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                Российская платформа · On-Premise · AI Decision Engine
              </div>
              <h1 className="text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3.4rem]">
                Мозг для парка устройств — внутри вашего контура
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Подключите промышленного робота, складскую тележку или симулятор
                через единый SDK. Передавайте телеметрию в реальном времени и
                получайте структурированные команды AI-движка на базе российских
                языковых моделей. Платформа разворачивается в инфраструктуре
                предприятия — данные не покидают периметр.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href="/contacts">
                  Подключить устройство <ArrowIcon />
                </Button>
                <Button href="/platform" variant="secondary">
                  Как устроена платформа
                </Button>
              </div>
            </div>

            <div className="lg:pl-4">
              <FlowDiagram />
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
                  Признание экспертов
                </div>
                <p className="mt-3 text-lg font-medium leading-relaxed">
                  Топ-36 среди 48&nbsp;478 идей форума «Сильные идеи для нового
                  времени 2026».
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  Оценка экспертов 3/3. Рекомендован к приоритетной поддержке.
                </p>
              </div>
              <figure className="border-t border-white/15 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <blockquote className="text-lg leading-relaxed">
                  «Один из наиболее проработанных и рыночно-ориентированных
                  проектов среди рассмотренных».
                </blockquote>
                <figcaption className="mt-3 text-sm text-white/60">
                  Заключение эксперта форума
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
            <SectionHeading
              eyebrow="Проблема"
              title="Западные платформы ушли — замены не появилось"
            />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>
                Российские компании, работающие с роботами и автономными
                устройствами, лишились доступа к западным облачным платформам
                управления после 2022 года. Отечественных аналогов не существует:
                каждая команда вынуждена самостоятельно строить инфраструктуру
                управления, тратя месяцы на разработку того, что должно быть
                готовой утилитой.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["152", "компании-интегратора в России"],
                  ["21 000", "устройств в парке, +14% в год"],
                  ["0", "готовых отечественных платформ"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl border border-line bg-surface p-4">
                    <div className="text-2xl font-semibold text-ink">{v}</div>
                    <div className="mt-1 text-sm leading-snug text-muted">{l}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted">
                Источник: НАУРР, Минпромторг, 2026.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* Solution */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Решение"
            title="Один протокол для любого железа"
            intro="Mevratek — платформа, которая позволяет подключить любое автономное устройство через единый SDK и API, передавать телеметрию в реальном времени и получать структурированные команды AI-движка на базе российских языковых моделей. Платформа не привязана к производителю железа: один и тот же протокол работает с промышленным роботом, складской тележкой и симулятором. Поставляется как On-Premise-решение — сервер платформы работает на инфраструктуре заказчика."
          />
          <div className="mt-10">
            <FlowDiagram />
          </div>
        </Container>
      </Section>

      {/* Metrics */}
      <Section>
        <Container>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
            <Stat value="1 день" label="до подключения первого устройства" />
            <Stat value="5" label="языков с официальным SDK: Python, JavaScript, Go, C++, C" />
            <Stat value="0" label="внешних запросов в закрытом контуре" />
            <Stat value="152" label="интегратора робототехники на рынке" />
          </div>
        </Container>
      </Section>

      {/* Platform components */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Компоненты"
            title="Из чего состоит платформа"
            intro="Чистая слоистая архитектура: логические сервисы внутри единого разворачиваемого бэкенда."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_COMPONENTS.map((c) => (
              <Card key={c.name} className="flex flex-col">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  {c.role}
                </div>
                <div className="mt-1 text-base font-semibold text-ink">
                  {c.name}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {c.detail}
                </p>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-accent hover:text-ink"
            >
              Подробно о платформе <ArrowIcon />
            </Link>
            <Link
              href="/documentation"
              className="text-accent hover:text-ink"
            >
              Документация
            </Link>
            <Link href="/blog" className="text-accent hover:text-ink">
              Блог
            </Link>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Подключите первое устройство за один день
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              Расскажите о вашей задаче — предложим сценарий пилота, оценим
              контур развёртывания и поможем с интеграцией через SDK.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button href="/contacts" variant="secondary">
                Подключить устройство <ArrowIcon />
              </Button>
              <Button
                href="/for-who"
                variant="secondary"
                className="!bg-transparent !text-white !ring-white/40 hover:!bg-white/10 hover:!ring-white/60"
              >
                Для кого платформа
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
