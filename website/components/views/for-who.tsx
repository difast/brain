import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { SEGMENTS } from "@/components/content";
import { BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const FOR_WHO_COPY = {
  ru: {
    metaTitle: "Для кого",
    metaDescription:
      "Mevratek для интеграторов робототехники, стартапов и R&D-команд, промышленных предприятий, университетов и лабораторий. Проблема, решение и результат для каждого сегмента.",
    ogTitle: "Для кого платформа Mevratek",
    crumb: "Для кого",
    eyebrow: "Для кого",
    title: "Одна платформа — четыре сценария",
    intro:
      "От интеграторов, которым нужен готовый слой управления, до лабораторий, которым важна среда для экспериментов.",
    problem: "Проблема",
    solution: "Как решает Mevratek",
    result: "Результат",
    ctaTitle: "Не нашли свой сценарий?",
    ctaBody:
      "Расскажите о вашей задаче — обсудим, как платформа подойдёт именно вам.",
    ctaButton: "Обсудить задачу",
  },
  en: {
    metaTitle: "Who it's for",
    metaDescription:
      "Mevratek for robotics integrators, startups and R&D teams, industrial enterprises, universities and labs. The problem, the solution and the outcome for each.",
    ogTitle: "Who the Mevratek platform is for",
    crumb: "Who it's for",
    eyebrow: "Who it's for",
    title: "One platform, four situations",
    intro:
      "From integrators who need a control layer that already exists, to labs that need somewhere to run experiments.",
    problem: "The problem",
    solution: "How Mevratek solves it",
    result: "The outcome",
    ctaTitle: "Not seeing your situation?",
    ctaBody:
      "Tell us about your task and we will work out how the platform fits it.",
    ctaButton: "Discuss your task",
  },
} as const;

export function ForWhoView({ locale }: { locale: Locale }) {
  const c = FOR_WHO_COPY[locale];

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: localePath(locale, "/") },
          { name: c.crumb, url: localePath(locale, "/for-who") },
        ]}
      />
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
        </Container>
      </Section>

      <Section className="!pt-0">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            {SEGMENTS.map((s, i) => (
              <div
                key={s.title.ru}
                className="flex flex-col rounded-2xl border border-line bg-white p-7"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface font-mono text-sm font-semibold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-xl font-semibold text-ink">
                    {s.title[locale]}
                  </h3>
                </div>

                <dl className="mt-6 space-y-5">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {c.problem}
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {s.problem[locale]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {c.solution}
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {s.solution[locale]}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-signal">
                      {c.result}
                    </dt>
                    <dd className="mt-1.5 text-sm font-medium leading-relaxed text-ink">
                      {s.result[locale]}
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
              {c.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">{c.ctaBody}</p>
            <div className="mt-8 flex justify-center">
              <Button href={localePath(locale, "/contacts")} variant="secondary">
                {c.ctaButton} <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
