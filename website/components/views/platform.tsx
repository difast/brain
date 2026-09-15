import Link from "next/link";

import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { ArchitectureDiagram } from "@/components/diagrams";
import { PLATFORM_COMPONENTS } from "@/components/content";
import { BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const PLATFORM_COPY = {
  ru: {
    metaTitle: "Платформа",
    metaDescription:
      "Архитектура Mevratek: Robot Registry, Task Engine, Decision Engine, Memory Layer, Telemetry, Action Translator, симулятор и SDK. Поддержка YandexGPT, GigaChat, локальных моделей и on-premise деплоя.",
    ogTitle: "Платформа Mevratek — архитектура и AI-движок",
    crumb: "Платформа",
    eyebrow: "Платформа",
    title: "Независимый слой управления устройствами",
    intro:
      "Mevratek — это не прокси к языковой модели, а полноценный слой управления: реестр устройств, движок задач, принятие решений, память и телеметрия. Модель — сменный компонент.",
    archTitle: "Архитектура",
    archBody:
      "Устройства — тонкие клиенты. Они стримят кадры, телеметрию и текущую задачу; сервер платформы возвращает структурированные команды. Каждый слой изолирован и заменяем.",
    archBullets: [
      "Единый протокол — от робота до симулятора",
      "Строгий JSON вместо свободного текста",
      "Неподдерживаемые команды отсекаются до устройства",
      "Модель меняется через конфигурацию, без правок API",
    ],
    compEyebrow: "Компоненты",
    compTitle: "Что делает каждый сервис",
    techEyebrow: "Ключевые технологии",
    techTitle: "Протокол и локальный деплой",
    techIntro:
      "Два направления, на которых строится независимость платформы: единый протокол управления любым железом и возможность развернуть всё внутри контура заказчика.",
    protocolTag: "Технология",
    protocolBody:
      "Единый протокол взаимодействия платформы и роботов: подключение устройств разных производителей через один API и набор команд, независимо от аппаратной архитектуры.",
    protocolLink: "Подробнее о протоколе",
    onpremTag: "Развёртывание",
    onpremBody:
      "Развёртывание платформы полностью внутри инфраструктуры заказчика: телеметрия, логи, AI-модели и данные устройств остаются в закрытом контуре предприятия.",
    onpremLink: "Подробнее о On-Premise",
    modelsEyebrow: "Model Router",
    modelsTitle: "Поддерживаемые AI-модели",
    modelsIntro:
      "Движок решений провайдер-независим. Переключение между моделями — вопрос конфигурации, контракт решения одинаков для всех.",
    models: [
      ["YandexGPT", "Российская языковая модель через OpenAI-совместимый шлюз."],
      ["GigaChat", "Модель Сбера для генерации решений в едином контракте."],
      [
        "Локальные модели",
        "Ollama, vLLM, LM Studio — любой OpenAI-совместимый эндпоинт.",
      ],
      [
        "On-premise деплой",
        "Полный контур внутри вашего периметра, без внешних вызовов.",
      ],
    ],
    simEyebrow: "Симулятор",
    simTitle: "Тестирование без физического устройства",
    simIntro:
      "Виртуальное устройство с живой телеметрией позволяет проверить интеграцию, сценарии задач и логику решений ещё до подключения реального железа.",
    simCta: "Запросить доступ",
    simRows: [
      ["Заряд", "88%"],
      ["Скорость", "0.3 м/с"],
      ["Координаты", "x 0.0 · y 0.0"],
      ["Протокол", "v1.0"],
    ],
    ctaTitle: "Готовы протестировать на своём устройстве?",
    ctaButton: "Подключить устройство",
  },
  en: {
    metaTitle: "Platform",
    metaDescription:
      "The Mevratek architecture: Robot Registry, Task Engine, Decision Engine, Memory Layer, Telemetry, Action Translator, a simulator and SDKs. Works with YandexGPT, GigaChat, local models and an on-premise deployment.",
    ogTitle: "The Mevratek platform — architecture and AI engine",
    crumb: "Platform",
    eyebrow: "Platform",
    title: "A control layer that stands on its own",
    intro:
      "Mevratek is not a proxy in front of a language model. It is a full control layer: a device registry, a task engine, decision-making, memory and telemetry. The model itself is a replaceable part.",
    archTitle: "Architecture",
    archBody:
      "Devices are thin clients. They stream frames, telemetry and their current task; the platform server returns structured commands. Every layer is isolated and replaceable.",
    archBullets: [
      "One protocol, from an industrial robot to a simulator",
      "Strict JSON instead of free-form text",
      "Unsupported commands are rejected before they reach the device",
      "Swapping models is configuration, not an API change",
    ],
    compEyebrow: "Components",
    compTitle: "What each service does",
    techEyebrow: "Key technologies",
    techTitle: "The protocol and the local deployment",
    techIntro:
      "Two things make the platform independent: one protocol that drives any hardware, and the ability to run the whole of it inside the customer's own perimeter.",
    protocolTag: "Technology",
    protocolBody:
      "One protocol between the platform and the robots: devices from different manufacturers connect through the same API and the same command set, whatever their hardware architecture.",
    protocolLink: "More about the protocol",
    onpremTag: "Deployment",
    onpremBody:
      "The platform runs entirely inside the customer's infrastructure: telemetry, logs, AI models and device data all stay within the closed perimeter.",
    onpremLink: "More about On-Premise",
    modelsEyebrow: "Model Router",
    modelsTitle: "Supported AI models",
    modelsIntro:
      "The decision engine is provider-independent. Switching models is a configuration change; the decision contract is identical either way.",
    models: [
      ["YandexGPT", "A Russian language model through an OpenAI-compatible gateway."],
      ["GigaChat", "Sber's model, producing decisions under the same contract."],
      [
        "Local models",
        "Ollama, vLLM, LM Studio — any OpenAI-compatible endpoint.",
      ],
      [
        "On-premise deployment",
        "The entire loop inside your perimeter, with no outbound calls.",
      ],
    ],
    simEyebrow: "Simulator",
    simTitle: "Testing without a physical device",
    simIntro:
      "A virtual device with live telemetry lets you check the integration, the task scenarios and the decision logic before any real hardware is connected.",
    simCta: "Request access",
    simRows: [
      ["Battery", "88%"],
      ["Speed", "0.3 m/s"],
      ["Position", "x 0.0 · y 0.0"],
      ["Protocol", "v1.0"],
    ],
    ctaTitle: "Ready to try it on your own device?",
    ctaButton: "Connect a device",
  },
} as const;

export function PlatformView({ locale }: { locale: Locale }) {
  const c = PLATFORM_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/platform") },
        ]}
      />
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
        </Container>
      </Section>

      {/* Architecture */}
      <Section className="!pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <h3 className="text-xl font-semibold">{c.archTitle}</h3>
              <p className="mt-3 text-muted">{c.archBody}</p>
              <ul className="mt-6 space-y-3 text-sm text-ink-soft">
                {c.archBullets.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ArchitectureDiagram locale={locale} />
          </div>
        </Container>
      </Section>

      {/* Components detail */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading eyebrow={c.compEyebrow} title={c.compTitle} />
          <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white">
            {PLATFORM_COMPONENTS.map((comp, i) => (
              <div
                key={comp.name}
                className="grid gap-4 p-6 sm:grid-cols-[auto_1fr_2fr] sm:items-baseline sm:gap-8"
              >
                <div className="font-mono text-sm text-muted">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-base font-semibold text-ink">
                    {comp.name}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">
                    {comp.role[locale]}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {comp.detail[locale]}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Key technologies hub */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow={c.techEyebrow}
            title={c.techTitle}
            intro={c.techIntro}
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Link
              href={p("/protocol")}
              className="group flex flex-col rounded-2xl border border-line bg-white p-7 transition-shadow hover:shadow-[0_1px_2px_rgba(20,23,28,0.04),0_8px_24px_-12px_rgba(20,23,28,0.12)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {c.protocolTag}
              </div>
              <div className="mt-1 text-xl font-semibold text-ink">
                Mevratek Protocol
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                {c.protocolBody}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:text-ink">
                {c.protocolLink} <ArrowIcon />
              </span>
            </Link>
            <Link
              href={p("/on-premise")}
              className="group flex flex-col rounded-2xl border border-line bg-white p-7 transition-shadow hover:shadow-[0_1px_2px_rgba(20,23,28,0.04),0_8px_24px_-12px_rgba(20,23,28,0.12)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {c.onpremTag}
              </div>
              <div className="mt-1 text-xl font-semibold text-ink">
                Mevratek On-Premise
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                {c.onpremBody}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:text-ink">
                {c.onpremLink} <ArrowIcon />
              </span>
            </Link>
          </div>
        </Container>
      </Section>

      {/* AI models */}
      <Section id="models" className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow={c.modelsEyebrow}
            title={c.modelsTitle}
            intro={c.modelsIntro}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {c.models.map(([name, detail]) => (
              <div key={name} className="rounded-xl border border-line bg-white p-6">
                <div className="text-base font-semibold text-ink">{name}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Simulator */}
      <Section id="simulator">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                eyebrow={c.simEyebrow}
                title={c.simTitle}
                intro={c.simIntro}
              />
              <div className="mt-8">
                <Button href={p("/contacts")}>
                  {c.simCta} <ArrowIcon />
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="text-sm font-semibold">Demo Rover</div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-signal">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" /> online
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {c.simRows.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="mt-0.5 font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
                {"goal: patrol the corridor"}
                <br />
                {"actions: [move_forward 0.4]"}
              </div>
            </div>
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
