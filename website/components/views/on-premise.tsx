import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/schema";
import { Compliance } from "@/components/compliance";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const ON_PREMISE_COPY = {
  ru: {
    metaTitle: "Mevratek On-Premise — платформа в вашем контуре",
    metaDescription:
      "Mevratek On-Premise — развёртывание платформы полностью внутри инфраструктуры заказчика. Телеметрия, логи решений, AI-модели и данные устройств остаются в закрытом контуре предприятия.",
    ogTitle: "Mevratek On-Premise — локальный деплой",
    crumb: "On-Premise",
    heroEyebrow: "Развёртывание · Enterprise",
    heroTitle: "Mevratek On-Premise — платформа в вашем контуре",
    heroIntro:
      "Mevratek поставляется как решение для закрытого контура: платформа разворачивается полностью внутри инфраструктуры заказчика. Данные, модели, телеметрия и управление роботами не покидают периметр предприятия. Внешнего облачного сервиса, в который уходила бы телеметрия, у нас нет — это единственная модель поставки.",
    whoEyebrow: "Для кого",
    whoTitle: "Когда данные не должны покидать периметр",
    whoP1:
      "On-Premise рассчитан на организации с повышенными требованиями к безопасности данных: предприятия с закрытыми контурами, критическую инфраструктуру и производства, смежные с ОПК, где отправка телеметрии, изображений и данных о процессе во внешнее облако недопустима.",
    whoP2Before:
      "Такие заказчики получают все возможности платформы — управление парком, движок решений, память, симулятор — но ",
    whoP2Strong: "полностью внутри своей инфраструктуры.",
    insideEyebrow: "Что остаётся внутри",
    insideTitle: "Всё — в закрытом контуре",
    insideIntro:
      "При локальном развёртывании ни один класс данных не уходит наружу:",
    inside: [
      ["Телеметрия", "Заряд, координаты, скорость, ошибки устройств."],
      ["Логи решений", "Полный журнал команд AI-движка и их контекста."],
      ["AI-модели", "Локальные модели внутри контура, без внешних вызовов."],
      ["Данные устройств", "Профили, кадры камер, история задач и исполнения."],
    ],
    aiEyebrow: "Локальный AI",
    aiTitle: "AI-модели без внешних запросов",
    aiIntro:
      "Движок решений провайдер-независим. В контуре предприятия он работает с локальными моделями через OpenAI-совместимый шлюз (Ollama, vLLM, LM Studio) — все вычисления остаются внутри, ни один запрос не уходит во внешние сервисы.",
    aiRows: [
      ["Провайдер модели", "локальный / OpenAI-совместимый"],
      ["Внешние вызовы", "нет"],
      ["Хранилище данных", "внутреннее (Postgres, S3-совместимое)"],
      ["Присутствие устройств", "в локальной БД, без внешних кэшей"],
    ],
    stagesEyebrow: "Этапы",
    stagesTitle: "Пилот и промышленный контур",
    stagesIntro:
      "Один и тот же продукт на двух этапах внедрения. Интерфейс, API, SDK и протокол идентичны — отличается масштаб парка и жёсткость требований к изоляции.",
    colPilot: "Пилот",
    colProd: "Промышленный контур",
    compare: [
      ["Где работает", "Тестовый сервер — ваш или наш", "Внутри инфраструктуры заказчика"],
      [
        "Данные и телеметрия",
        "Тестовые устройства и симулятор",
        "Боевой парк, данные не покидают контур",
      ],
      [
        "AI-модели",
        "Российские LLM по API или локальные",
        "Локальные модели (Ollama, vLLM, LM Studio)",
      ],
      ["Внешние запросы", "Допустимы к провайдеру модели", "Отсутствуют — закрытый контур"],
      ["API · SDK · протокол", "Единые", "Те же самые, без изменений"],
      ["Срок", "От одного дня до первого устройства", "По графику внедрения"],
    ],
    statusEyebrow: "Статус",
    statusTitle: "Что доступно сейчас",
    availableLabel: "Доступно",
    availableBody:
      "Базовое локальное развёртывание уже работает: платформа разворачивается контейнерами, использует локальные модели через OpenAI-совместимый шлюз и не требует обязательных внешних сервисов. Тот же API, SDK и протокол, что и на пилотном стенде.",
    roadmapLabel: "В дорожной карте",
    roadmapBefore: "Коробочная поставка ",
    roadmapStrong: "Mevratek Enterprise On-Premise",
    roadmapAfter:
      " — единый инсталлятор, работа в air-gapped-среде, лицензирование и сопровождение — в планах развития на 2026–2027 в рамках промышленных пилотов.",
    howEyebrow: "Как мы работаем",
    howTitle: "От заявки до промышленного внедрения",
    howIntro:
      "Мы не продаём подписку на внешний сервис — поставка идёт по договору, под конкретный парк и контур. Поэтому путь начинается с разговора, а не с прайс-листа.",
    steps: [
      [
        "Заявка",
        "Вы описываете парк устройств и требования к контуру. Отвечаем в течение рабочего дня.",
      ],
      [
        "Демонстрация и оценка контура",
        "Показываем платформу в работе, разбираем вашу инфраструктуру и требования безопасности.",
      ],
      [
        "Пилот",
        "Разворачиваем стенд и подключаем ограниченный парк. Проверяем сценарии на ваших задачах.",
      ],
      [
        "Внедрение",
        "Развёртывание в промышленном контуре, лицензия и сопровождение по договору.",
      ],
    ],
    termsTitle: "Условия поставки",
    termsBody:
      "Поставка осуществляется по договору, оплата — по счёту для юридических лиц. Стоимость зависит от размера парка устройств, контура развёртывания и объёма сопровождения, поэтому определяется индивидуально по итогам оценки. Публичного прайс-листа и самостоятельной регистрации нет: доступ к платформе открывается после заключения договора.",
    ctaTitle: "Нужен деплой в закрытом контуре?",
    ctaBody:
      "Расскажите о требованиях к безопасности и инфраструктуре — обсудим локальное развёртывание под ваш периметр.",
    ctaButton: "Обсудить On-Premise",
  },
  en: {
    metaTitle: "Mevratek On-Premise — the platform inside your perimeter",
    metaDescription:
      "Mevratek On-Premise deploys the platform entirely inside the customer's infrastructure. Telemetry, decision logs, AI models and device data all stay within the enterprise's closed perimeter.",
    ogTitle: "Mevratek On-Premise — a local deployment",
    crumb: "On-Premise",
    heroEyebrow: "Deployment · Enterprise",
    heroTitle: "Mevratek On-Premise — the platform inside your perimeter",
    heroIntro:
      "Mevratek ships as a closed-perimeter product: the platform is deployed entirely inside the customer's own infrastructure. Data, models, telemetry and robot control never leave the enterprise. There is no external cloud service for telemetry to flow into — this is the only delivery model we offer.",
    whoEyebrow: "Who it is for",
    whoTitle: "When data must not leave the perimeter",
    whoP1:
      "On-Premise is built for organisations with elevated data-security requirements: enterprises running closed networks, critical infrastructure, and defence-adjacent manufacturing, where sending telemetry, imagery or process data to an external cloud is simply not allowed.",
    whoP2Before:
      "Those customers get every capability of the platform — fleet control, the decision engine, memory, the simulator — but ",
    whoP2Strong: "entirely inside their own infrastructure.",
    insideEyebrow: "What stays inside",
    insideTitle: "All of it, in a closed perimeter",
    insideIntro:
      "In a local deployment, not one class of data goes out:",
    inside: [
      ["Telemetry", "Battery, position, speed and device errors."],
      ["Decision logs", "The full journal of AI-engine commands and their context."],
      ["AI models", "Local models inside the perimeter, with no outbound calls."],
      ["Device data", "Profiles, camera frames, task and execution history."],
    ],
    aiEyebrow: "Local AI",
    aiTitle: "AI models with no outbound requests",
    aiIntro:
      "The decision engine is provider-independent. Inside an enterprise perimeter it runs local models through an OpenAI-compatible gateway (Ollama, vLLM, LM Studio) — every computation stays inside and no request reaches an external service.",
    aiRows: [
      ["Model provider", "local / OpenAI-compatible"],
      ["Outbound calls", "none"],
      ["Data store", "internal (Postgres, S3-compatible)"],
      ["Device presence", "in the local database, no external cache"],
    ],
    stagesEyebrow: "Stages",
    stagesTitle: "Pilot and production perimeter",
    stagesIntro:
      "The same product at two stages of rollout. The interface, API, SDK and protocol are identical — what differs is the size of the fleet and how strict the isolation requirements are.",
    colPilot: "Pilot",
    colProd: "Production perimeter",
    compare: [
      ["Where it runs", "A test server — yours or ours", "Inside the customer's infrastructure"],
      [
        "Data and telemetry",
        "Test devices and the simulator",
        "The live fleet; data never leaves the perimeter",
      ],
      [
        "AI models",
        "Russian LLMs over an API, or local ones",
        "Local models (Ollama, vLLM, LM Studio)",
      ],
      ["Outbound requests", "Allowed, to the model provider", "None — a closed perimeter"],
      ["API · SDK · protocol", "The same", "Exactly the same, unchanged"],
      ["Timeline", "One day to the first device", "To the rollout schedule"],
    ],
    statusEyebrow: "Status",
    statusTitle: "What is available today",
    availableLabel: "Available",
    availableBody:
      "The basic local deployment already works: the platform runs as containers, uses local models through an OpenAI-compatible gateway, and requires no external service at all. The same API, SDK and protocol as on the pilot stand.",
    roadmapLabel: "On the roadmap",
    roadmapBefore: "A packaged ",
    roadmapStrong: "Mevratek Enterprise On-Premise",
    roadmapAfter:
      " — one installer, air-gapped operation, licensing and support — is planned for 2026–2027 alongside the industrial pilots.",
    howEyebrow: "How we work",
    howTitle: "From first enquiry to production rollout",
    howIntro:
      "We do not sell a subscription to an external service. Delivery is contractual and sized to a specific fleet and perimeter, so it starts with a conversation rather than a price list.",
    steps: [
      [
        "Enquiry",
        "You describe your fleet and your perimeter requirements. We reply within one business day.",
      ],
      [
        "Demo and perimeter assessment",
        "We show the platform working, then go through your infrastructure and security requirements.",
      ],
      [
        "Pilot",
        "We stand up an environment and connect a limited fleet, testing the scenarios against your own tasks.",
      ],
      [
        "Rollout",
        "Deployment into the production perimeter, with a licence and support under contract.",
      ],
    ],
    termsTitle: "Commercial terms",
    termsBody:
      "Delivery is under contract, invoiced to a legal entity. The price depends on the size of the fleet, the deployment perimeter and the level of support, so it is quoted individually after an assessment. There is no public price list and no self-service sign-up: access opens once the contract is in place.",
    ctaTitle: "Need a deployment in a closed perimeter?",
    ctaBody:
      "Tell us about your security and infrastructure requirements and we will work through a local deployment for your perimeter.",
    ctaButton: "Discuss On-Premise",
  },
} as const;

export function OnPremiseView({ locale }: { locale: Locale }) {
  const c = ON_PREMISE_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/on-premise") },
        ]}
      />
      {/* Hero */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading
            eyebrow={c.heroEyebrow}
            title={c.heroTitle}
            intro={c.heroIntro}
          />
        </Container>
      </Section>

      {/* For whom */}
      <Section className="!pt-0">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow={c.whoEyebrow} title={c.whoTitle} />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>{c.whoP1}</p>
              <p>
                {c.whoP2Before}
                <strong>{c.whoP2Strong}</strong>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* What stays inside */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow={c.insideEyebrow}
            title={c.insideTitle}
            intro={c.insideIntro}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.inside.map(([title, detail]) => (
              <div key={title} className="rounded-xl border border-line bg-white p-6">
                <div className="text-base font-semibold text-ink">{title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Local AI */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <SectionHeading
              eyebrow={c.aiEyebrow}
              title={c.aiTitle}
              intro={c.aiIntro}
            />
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="space-y-3 text-sm">
                {c.aiRows.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-muted">{k}</span>
                    <span className="text-right font-medium text-ink">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Compliance locale={locale} />

      {/* Comparison */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow={c.stagesEyebrow}
            title={c.stagesTitle}
            intro={c.stagesIntro}
          />
          <div className="mt-10 overflow-x-auto">
            <div className="min-w-[640px] overflow-hidden rounded-2xl border border-line bg-white">
              <div className="grid grid-cols-3 border-b border-line bg-surface text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                <div className="p-4" />
                <div className="p-4">{c.colPilot}</div>
                <div className="p-4">{c.colProd}</div>
              </div>
              {c.compare.map(([row, pilot, prod]) => (
                <div
                  key={row}
                  className="grid grid-cols-3 border-b border-line text-sm last:border-0"
                >
                  <div className="p-4 font-medium text-ink">{row}</div>
                  <div className="p-4 text-muted">{pilot}</div>
                  <div className="p-4 text-ink-soft">{prod}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Status */}
      <Section>
        <Container>
          <SectionHeading eyebrow={c.statusEyebrow} title={c.statusTitle} />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-7">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-signal">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />{" "}
                {c.availableLabel}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {c.availableBody}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-7">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />{" "}
                {c.roadmapLabel}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {c.roadmapBefore}
                <strong>{c.roadmapStrong}</strong>
                {c.roadmapAfter}
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* How we work */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow={c.howEyebrow}
            title={c.howTitle}
            intro={c.howIntro}
          />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map(([title, detail], i) => (
              <li key={title} className="rounded-2xl border border-line bg-white p-6">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-strong text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <div className="mt-4 text-base font-semibold text-ink">{title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-line bg-white p-7">
            <div className="text-base font-semibold text-ink">{c.termsTitle}</div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
              {c.termsBody}
            </p>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section className="!pt-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center text-white sm:py-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
              {c.ctaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">{c.ctaBody}</p>
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
