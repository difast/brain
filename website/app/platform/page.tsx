import type { Metadata } from "next";
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
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Платформа",
  description:
    "Архитектура Mevratek: Robot Registry, Task Engine, Decision Engine, Memory Layer, Telemetry, Action Translator, симулятор и SDK. Поддержка YandexGPT, GigaChat, локальных моделей и on-premise деплоя.",
  alternates: { canonical: "/platform" },
  openGraph: {
    title: "Платформа Mevratek — архитектура и AI-движок",
    description:
      "Слоистая архитектура управления устройствами и Model Router с поддержкой российских языковых моделей.",
    url: "/platform",
    images: [OG_IMAGE],
  },
};

const MODELS = [
  {
    name: "YandexGPT",
    detail: "Российская языковая модель через OpenAI-совместимый шлюз.",
  },
  {
    name: "GigaChat",
    detail: "Модель Сбера для генерации решений в едином контракте.",
  },
  {
    name: "Локальные модели",
    detail: "Ollama, vLLM, LM Studio — любой OpenAI-совместимый эндпоинт.",
  },
  {
    name: "On-premise деплой",
    detail: "Полный контур внутри вашего периметра, без внешних вызовов.",
  },
];

export default function PlatformPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Платформа", url: "/platform" },
        ]}
      />
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading
            eyebrow="Платформа"
            title="Независимый слой управления устройствами"
            intro="Mevratek — это не прокси к языковой модели, а полноценный слой управления: реестр устройств, движок задач, принятие решений, память и телеметрия. Модель — сменный компонент."
          />
        </Container>
      </Section>

      {/* Architecture */}
      <Section className="!pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <h3 className="text-xl font-semibold">Архитектура</h3>
              <p className="mt-3 text-muted">
                Устройства — тонкие клиенты. Они стримят кадры, телеметрию и
                текущую задачу; сервер платформы возвращает структурированные
                команды.
                Каждый слой изолирован и заменяем.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink-soft">
                {[
                  "Единый протокол — от робота до симулятора",
                  "Строгий JSON вместо свободного текста",
                  "Неподдерживаемые команды отсекаются до устройства",
                  "Модель меняется через конфигурацию, без правок API",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ArchitectureDiagram />
          </div>
        </Container>
      </Section>

      {/* Components detail */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Компоненты"
            title="Что делает каждый сервис"
          />
          <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white">
            {PLATFORM_COMPONENTS.map((c, i) => (
              <div
                key={c.name}
                className="grid gap-4 p-6 sm:grid-cols-[auto_1fr_2fr] sm:items-baseline sm:gap-8"
              >
                <div className="font-mono text-sm text-muted">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-base font-semibold text-ink">{c.name}</div>
                  <div className="mt-0.5 text-sm text-muted">{c.role}</div>
                </div>
                <p className="text-sm leading-relaxed text-ink-soft">{c.detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Key technologies hub */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Ключевые технологии"
            title="Протокол и локальный деплой"
            intro="Два направления, на которых строится независимость платформы: единый протокол управления любым железом и возможность развернуть всё внутри контура заказчика."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Link
              href="/protocol"
              className="group flex flex-col rounded-2xl border border-line bg-white p-7 transition-shadow hover:shadow-[0_1px_2px_rgba(20,23,28,0.04),0_8px_24px_-12px_rgba(20,23,28,0.12)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Технология
              </div>
              <div className="mt-1 text-xl font-semibold text-ink">
                Mevratek Protocol
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                Единый протокол взаимодействия облака и роботов: подключение
                устройств разных производителей через один API и набор команд,
                независимо от аппаратной архитектуры.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:text-ink">
                Подробнее о протоколе <ArrowIcon />
              </span>
            </Link>
            <Link
              href="/on-premise"
              className="group flex flex-col rounded-2xl border border-line bg-white p-7 transition-shadow hover:shadow-[0_1px_2px_rgba(20,23,28,0.04),0_8px_24px_-12px_rgba(20,23,28,0.12)]"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Развёртывание
              </div>
              <div className="mt-1 text-xl font-semibold text-ink">
                Mevratek On-Premise
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                Развёртывание платформы полностью внутри инфраструктуры
                заказчика: телеметрия, логи, AI-модели и данные устройств
                остаются в закрытом контуре предприятия.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent group-hover:text-ink">
                Подробнее о On-Premise <ArrowIcon />
              </span>
            </Link>
          </div>
        </Container>
      </Section>

      {/* AI models */}
      <Section id="models" className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Model Router"
            title="Поддерживаемые AI-модели"
            intro="Движок решений провайдер-независим. Переключение между моделями — вопрос конфигурации, контракт решения одинаков для всех."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODELS.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-line bg-white p-6"
              >
                <div className="text-base font-semibold text-ink">{m.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {m.detail}
                </p>
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
                eyebrow="Симулятор"
                title="Тестирование без физического устройства"
                intro="Виртуальное устройство с живой телеметрией позволяет проверить интеграцию, сценарии задач и логику решений ещё до подключения реального железа."
              />
              <div className="mt-8">
                <Button href="/contacts">
                  Запросить доступ <ArrowIcon />
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
                {[
                  ["Заряд", "88%"],
                  ["Скорость", "0.3 м/с"],
                  ["Координаты", "x 0.0 · y 0.0"],
                  ["Протокол", "v1.0"],
                ].map(([k, v]) => (
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
              Готовы протестировать на своём устройстве?
            </h2>
            <div className="mt-8 flex justify-center">
              <Button href="/contacts" variant="secondary">
                Подключить устройство <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
