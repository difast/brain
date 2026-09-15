import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

const CAPABILITY_SAMPLE = `{ "type": "move_forward",
  "value": { "type": "number", "min": 0, "max": 1, "unit": "m" } }`;

const DECISION_SAMPLE = `{ "goal": "approach the object",
  "confidence": 0.91,
  "actions": [
    { "action_id": "a1", "type": "move_forward", "value": 0.5 }
  ] }`;

const SDK_SAMPLE = `bot = BrainClient.register(API, api_key="cbk_...",
        name="rover-01", robot_type="rover", capabilities=[...])
while True:
    bot.heartbeat()
    d = bot.decide(task="...", state={...})
    execute(d["actions"])`;

export const PROTOCOL_COPY = {
  ru: {
    metaTitle: "Mevratek Protocol — единый протокол управления устройствами",
    metaDescription:
      "Mevratek Protocol — единый протокол взаимодействия платформы и роботов: подключение устройств разных производителей через унифицированный API и набор команд, независимо от аппаратной архитектуры.",
    ogTitle: "Mevratek Protocol — единый протокол управления устройствами",
    crumb: "Protocol",
    heroEyebrow: "Технология · ключевой актив",
    heroTitle: "Mevratek Protocol — единый протокол управления устройствами",
    heroIntro:
      "Единый протокол взаимодействия между сервером платформы и роботами. Он позволяет подключать устройства разных производителей через унифицированный API и общий набор команд — независимо от их аппаратной архитектуры. Протокол одинаков в пилотном стенде и в закрытом контуре предприятия. Это ключевое технологическое направление развития Mevratek.",
    problemEyebrow: "Проблема",
    problemTitle: "«Зоопарк» устройств",
    problemP1:
      "У каждого производителя робота — свой протокол, свой SDK, свой набор команд и своя логика. Как только парк состоит из устройств разных вендоров, интегратор вынужден писать и поддерживать отдельную интеграцию под каждое: разные форматы, разная аутентификация, разные модели управления.",
    problemP2Before:
      "Результат — месяцы работы на «склейку» вместо развития продукта, и невозможность управлять разнородным парком единообразно. ",
    problemP2Strong:
      "Mevratek Protocol убирает эту фрагментацию — один контракт для любого железа.",
    howEyebrow: "Как это работает",
    howTitle: "Абстракция над железом",
    howIntro:
      "Устройство описывается данными — своим типом и списком возможностей (команд, которые оно понимает). Платформа управляет устройством через эти возможности, а не через конкретную модель железа. Поэтому один и тот же код управляет разными устройствами.",
    boxLeft: "Разные устройства",
    boxLeftSub: "свои прошивки и команды",
    boxMid: "Mevratek Protocol",
    boxMidSub: "единый контракт + трансляция команд",
    boxRight: "Один код управления",
    boxRightSub: "сервер платформы + AI-движок",
    howFootnote:
      "Универсальные действия модели транслируются в конкретные команды устройства из его возможностей, а всё, что устройство не умеет, — отсекается. Новый тип устройства подключается описанием его команд, без изменений ядра платформы.",
    structEyebrow: "Структура протокола",
    structTitle: "Строгий контракт вместо свободного текста",
    structIntro:
      "Устройство объявляет свои возможности, шлёт состояние и телеметрию, а в ответ получает строго структурированный JSON: цель, уверенность и список команд с идентификаторами. Никакого свободного текста — только исполнимые действия.",
    step1: "1 · Возможности устройства",
    step2: "2 · Решение от платформы",
    compatEyebrow: "Совместимость",
    compatTitle: "Один протокол — любое железо",
    compatIntro:
      "Протокол не привязан к производителю и типу устройства. Он рассчитан на самый разный парк:",
    devices: [
      "Промышленные роботы",
      "Мобильные платформы (AMR)",
      "Складские тележки (AGV)",
      "Дроны",
      "Манипуляторы",
      "Симулятор",
    ],
    sdkEyebrow: "Открытый SDK",
    sdkTitle: "Подключение за один день",
    sdkIntro:
      "На базе протокола — устанавливаемый SDK и REST API. Устройство подключается несколькими строками кода: регистрация → отправка состояния → получение команд → исполнение → обратная связь. Реальное устройство или симулятор — путь одинаковый.",
    sdkButton: "Получить доступ к SDK",
    goalBadge: "Долгосрочная цель",
    goalTitle:
      "Основа межпроизводственной совместимости устройств в России",
    goalBody:
      "Наша цель — сделать Mevratek Protocol основой совместимости роботов на российском рынке. Это направление развития, а не свершившийся стандарт.",
    goalButton: "Обсудить интеграцию",
  },
  en: {
    metaTitle: "Mevratek Protocol — one protocol for device control",
    metaDescription:
      "Mevratek Protocol is one protocol between the platform and the robots: devices from different manufacturers connect through a unified API and a shared command set, whatever their hardware architecture.",
    ogTitle: "Mevratek Protocol — one protocol for device control",
    crumb: "Protocol",
    heroEyebrow: "Technology · the core asset",
    heroTitle: "Mevratek Protocol — one protocol for device control",
    heroIntro:
      "One protocol between the platform server and the robots. It lets devices from different manufacturers connect through a unified API and a shared command set, whatever their hardware architecture. The protocol is identical on a pilot stand and inside an enterprise's closed perimeter. This is the technology Mevratek is built around.",
    problemEyebrow: "The problem",
    problemTitle: "A zoo of devices",
    problemP1:
      "Every robot manufacturer has its own protocol, its own SDK, its own command set and its own logic. The moment a fleet contains devices from more than one vendor, the integrator has to write and maintain a separate integration for each: different formats, different authentication, different control models.",
    problemP2Before:
      "The result is months spent on glue code instead of on the product, and no way to operate a mixed fleet consistently. ",
    problemP2Strong:
      "Mevratek Protocol removes that fragmentation — one contract for any hardware.",
    howEyebrow: "How it works",
    howTitle: "An abstraction over the hardware",
    howIntro:
      "A device is described by data: its type and the list of capabilities — the commands it understands. The platform drives the device through those capabilities rather than through a particular hardware model, which is why the same code drives different devices.",
    boxLeft: "Different devices",
    boxLeftSub: "each with its own firmware and commands",
    boxMid: "Mevratek Protocol",
    boxMidSub: "one contract + command translation",
    boxRight: "One control codebase",
    boxRightSub: "platform server + AI engine",
    howFootnote:
      "The model's generic actions are translated into the concrete commands the device declares, and anything the device cannot do is rejected. A new device type is onboarded by describing its commands — no change to the platform core.",
    structEyebrow: "Protocol structure",
    structTitle: "A strict contract instead of free text",
    structIntro:
      "The device declares its capabilities and sends its state and telemetry; it receives strictly structured JSON in return — a goal, a confidence value, and a list of commands with identifiers. No free text, only executable actions.",
    step1: "1 · Device capabilities",
    step2: "2 · The platform's decision",
    compatEyebrow: "Compatibility",
    compatTitle: "One protocol, any hardware",
    compatIntro:
      "The protocol is tied to no manufacturer and no device type. It is built for a varied fleet:",
    devices: [
      "Industrial robots",
      "Mobile platforms (AMR)",
      "Warehouse carts (AGV)",
      "Drones",
      "Manipulators",
      "Simulator",
    ],
    sdkEyebrow: "Open SDK",
    sdkTitle: "Connected in a day",
    sdkIntro:
      "On top of the protocol sit an installable SDK and a REST API. A device connects in a few lines of code: register → send state → receive commands → execute → report back. Real hardware or the simulator — the path is the same.",
    sdkButton: "Get SDK access",
    goalBadge: "The long-term goal",
    goalTitle: "A basis for cross-vendor device compatibility in Russia",
    goalBody:
      "Our aim is for Mevratek Protocol to become the basis of robot compatibility in the Russian market. That is a direction of development, not a standard that already exists.",
    goalButton: "Discuss an integration",
  },
} as const;

export function ProtocolView({ locale }: { locale: Locale }) {
  const c = PROTOCOL_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/protocol") },
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

      {/* Problem */}
      <Section className="!pt-0">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow={c.problemEyebrow} title={c.problemTitle} />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>{c.problemP1}</p>
              <p>
                {c.problemP2Before}
                <strong>{c.problemP2Strong}</strong>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow={c.howEyebrow}
            title={c.howTitle}
            intro={c.howIntro}
          />
          <div className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-8">
            <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
              <div className="flex flex-col justify-center rounded-xl border border-line bg-surface px-4 py-5 text-center">
                <div className="text-sm font-semibold">{c.boxLeft}</div>
                <div className="mt-1 text-xs text-muted">{c.boxLeftSub}</div>
              </div>
              <div className="flex items-center justify-center text-muted">
                <ArrowIcon />
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-accent/30 bg-accent-strong px-4 py-5 text-center text-white">
                <div className="text-sm font-semibold">{c.boxMid}</div>
                <div className="mt-1 text-xs text-white/70">{c.boxMidSub}</div>
              </div>
              <div className="flex items-center justify-center text-muted">
                <ArrowIcon />
              </div>
              <div className="flex flex-col justify-center rounded-xl border border-line bg-surface px-4 py-5 text-center">
                <div className="text-sm font-semibold">{c.boxRight}</div>
                <div className="mt-1 text-xs text-muted">{c.boxRightSub}</div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              {c.howFootnote}
            </p>
          </div>
        </Container>
      </Section>

      {/* Command structure */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <SectionHeading
              eyebrow={c.structEyebrow}
              title={c.structTitle}
              intro={c.structIntro}
            />
            {/* Same reason as the docs page: without min-w-0 the JSON
                samples set the column width and the section overflows. */}
            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {c.step1}
                </div>
                <pre className="overflow-x-auto rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
                  {CAPABILITY_SAMPLE}
                </pre>
              </div>
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {c.step2}
                </div>
                <pre className="overflow-x-auto rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
                  {DECISION_SAMPLE}
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
            eyebrow={c.compatEyebrow}
            title={c.compatTitle}
            intro={c.compatIntro}
          />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {c.devices.map((d) => (
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
              eyebrow={c.sdkEyebrow}
              title={c.sdkTitle}
              intro={c.sdkIntro}
            />
            <div className="min-w-0 rounded-2xl border border-line bg-white p-6">
              <pre className="overflow-x-auto rounded-lg bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-ink-soft">
                {SDK_SAMPLE}
              </pre>
              <div className="mt-5">
                <Button href={p("/contacts")}>
                  {c.sdkButton} <ArrowIcon />
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
                  {c.goalBadge}
                </span>
              </div>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                {c.goalTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/85">{c.goalBody}</p>
              <div className="mt-8 flex justify-center">
                <Button href={p("/contacts")} variant="secondary">
                  {c.goalButton} <ArrowIcon />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
