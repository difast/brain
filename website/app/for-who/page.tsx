import type { Metadata } from "next";
import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { SEGMENTS } from "@/components/content";
import { BreadcrumbJsonLd } from "@/components/schema";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Для кого",
  description:
    "Mevratek для интеграторов робототехники, стартапов и R&D-команд, промышленных предприятий, университетов и лабораторий. Проблема, решение и результат для каждого сегмента.",
  alternates: { canonical: "/for-who" },
  openGraph: {
    title: "Для кого платформа Mevratek",
    description:
      "Интеграторы, стартапы, промышленность, наука — как Mevratek решает задачу управления устройствами для каждого.",
    url: "/for-who",
    images: [OG_IMAGE],
  },
};

export default function ForWhoPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Для кого", url: "/for-who" },
        ]}
      />
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading
            eyebrow="Для кого"
            title="Одна платформа — четыре сценария"
            intro="От интеграторов, которым нужен готовый слой управления, до лабораторий, которым важна среда для экспериментов."
          />
        </Container>
      </Section>

      <Section className="!pt-0">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            {SEGMENTS.map((s, i) => (
              <div
                key={s.title}
                className="flex flex-col rounded-2xl border border-line bg-white p-7"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface font-mono text-sm font-semibold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl font-semibold text-ink">{s.title}</h3>
                </div>

                <dl className="mt-6 space-y-5">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Проблема
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {s.problem}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Как решает Mevratek
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {s.solution}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-signal">
                      Результат
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium leading-relaxed text-ink">
                      {s.result}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="!pt-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center sm:py-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
              Не нашли свой сценарий?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Расскажите о вашей задаче — обсудим, как платформа подойдёт именно
              вам.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/contacts" variant="secondary">
                Обсудить задачу <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
