import type { Metadata } from "next";
import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/schema";

export const metadata: Metadata = {
  title: "Mevratek Protocol — единый протокол управления устройствами",
  description:
    "Mevratek Protocol — единый протокол взаимодействия облака и роботов: подключение устройств разных производителей через унифицированный API и набор команд, независимо от аппаратной архитектуры.",
  alternates: { canonical: "/protocol" },
  openGraph: {
    title: "Mevratek Protocol — единый протокол управления устройствами",
    description:
      "Абстракция над железом: один код управляет промышленными роботами, мобильными платформами, дронами, AGV и симулятором через один протокол.",
    url: "/protocol",
  },
};

const DEVICES = [
  "Промышленные роботы",
  "Мобильные платформы (AMR)",
  "Складские тележки (AGV)",
  "Дроны",
  "Манипуляторы",
  "Симулятор",
];

export default function ProtocolPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Protocol", url: "/protocol" },
        ]}
      />
      {/* Hero */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading
            eyebrow="Технология · ключевой актив"
            title="Mevratek Protocol — единый протокол управления устройствами"
            intro="Единый протокол взаимодействия между сервером платформы и роботами. Он позволяет подключать устройства разных производителей через унифицированный API и общий набор команд — независимо от их аппаратной архитектуры. Протокол одинаков в пилотном стенде и в закрытом контуре предприятия. Это ключевое технологическое направление развития Mevratek."
          />
        </Container>
      </Section>

      {/* Problem */}
      <Section className="!pt-0">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading
              eyebrow="Проблема"
              title="«Зоопарк» устройств"
            />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>
                У каждого производителя робота — свой протокол, свой SDK, свой
                набор команд и своя логика. Как только парк состоит из устройств
                разных вендоров, интегратор вынужден писать и поддерживать
                отдельную интеграцию под каждое: разные форматы, разная
                аутентификация, разные модели управления.
              </p>
              <p>
                Результат — месяцы работы на «склейку» вместо развития продукта, и
                невозможность управлять разнородным парком единообразно.{" "}
                <strong>
                  Mevratek Protocol убирает эту фрагментацию — один контракт для
                  любого железа.
                </strong>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Как это работает"
            title="Абстракция над железом"
            intro="Устройство описывается данными — своим типом и списком возможностей (команд, которые оно понимает). Облако управляет устройством через эти возможности, а не через конкретную модель железа. Поэтому один и тот же код управляет разными устройствами."
          />
          <div className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-8">
            <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
              <div className="flex flex-col justify-center rounded-xl border border-line bg-surface px-4 py-5 text-center">
                <div className="text-sm font-semibold">Разные устройства</div>
                <div className="mt-1 text-xs text-muted">
                  свои прошивки и команды
                </div>
              </div>
              <div className="flex items-center justify-center text-muted">
                <ArrowIcon />
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-accent/30 bg-accent-strong px-4 py-5 text-center text-white">
                <div className="text-sm font-semibold">Mevratek Protocol</div>
                <div className="mt-1 text-xs text-white/70">
                  единый контракт + трансляция команд
                </div>
              </div>
              <div className="flex items-center justify-center text-muted">
                <ArrowIcon />
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-line bg-surface px-4 py-5 text-center">
                <div className="text-sm font-semibold">Один код управления</div>
                <div className="mt-1 text-xs text-muted">
                  сервер платформы + AI-движок
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Универсальные действия модели транслируются в конкретные команды
              устройства из его возможностей, а всё, что устройство не умеет, —
              отсекается. Новый тип устройства подключается описанием его команд,
              без изменений ядра платформы.
            </p>
          </div>
        </Container>
      </Section>

      {/* Command structure */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <SectionHeading
              eyebrow="Структура протокола"
              title="Строгий контракт вместо свободного текста"
              intro="Устройство объявляет свои возможности, шлёт состояние и телеметрию, а в ответ получает строго структурированный JSON: цель, уверенность и список команд с идентификаторами. Никакого свободного текста — только исполнимые действия."
            />
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  1 · Возможности устройства
                </div>
                <pre className="overflow-x-auto rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
{`{ "type": "move_forward",
  "value": { "type": "number", "min": 0, "max": 1, "unit": "m" } }`}
                </pre>
              </div>
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  2 · Решение от облака
                </div>
                <pre className="overflow-x-auto rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
{`{ "goal": "approach the object",
  "confidence": 0.91,
  "actions": [
    { "action_id": "a1", "type": "move_forward", "value": 0.5 }
  ] }`}
                </pre>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Compatibility */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Совместимость"
            title="Один протокол — любое железо"
            intro="Протокол не привязан к производителю и типу устройства. Он рассчитан на самый разный парк:"
          />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {DEVICES.map((d) => (
              <div
                key={d}
                className="flex items-center gap-3 rounded-xl border border-line bg-white px-5 py-4"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-signal" />
                <span className="text-sm font-medium text-ink">{d}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Open SDK */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <SectionHeading
              eyebrow="Открытый SDK"
              title="Подключение за один день"
              intro="На базе протокола — устанавливаемый SDK и REST API. Устройство подключается несколькими строками кода: регистрация → отправка состояния → получение команд → исполнение → обратная связь. Реальное устройство или симулятор — путь одинаковый."
            />
            <div className="rounded-2xl border border-line bg-white p-6">
              <pre className="overflow-x-auto rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
{`bot = BrainClient.register(API, api_key="cbk_...",
        name="rover-01", robot_type="rover", capabilities=[...])
while True:
    bot.heartbeat()
    d = bot.decide(task="...", state={...})
    execute(d["actions"])`}
              </pre>
              <div className="mt-5">
                <Button href="/contacts">
                  Получить доступ к SDK <ArrowIcon />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Long-term goal */}
      <Section className="!pt-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center text-white sm:px-10 sm:py-16">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/70">
                  Долгосрочная цель
                </span>
              </div>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                Основа межпроизводственной совместимости устройств в России
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">
                Наша цель — сделать Mevratek Protocol основой совместимости
                роботов на российском рынке. Это направление развития, а не
                свершившийся стандарт.
              </p>
              <div className="mt-8 flex justify-center">
                <Button href="/contacts" variant="secondary">
                  Обсудить интеграцию <ArrowIcon />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
