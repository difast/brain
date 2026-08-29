import type { Metadata } from "next";
import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Mevratek On-Premise — платформа в вашем контуре",
  description:
    "Mevratek On-Premise — развёртывание платформы полностью внутри инфраструктуры заказчика. Телеметрия, логи решений, AI-модели и данные устройств остаются в закрытом контуре предприятия.",
  alternates: { canonical: "/on-premise" },
  openGraph: {
    title: "Mevratek On-Premise — локальный деплой",
    description:
      "Платформа управления роботами в закрытом контуре: локальные AI-модели без внешних API-запросов, полный контроль над данными.",
    url: "/on-premise",
  },
};

const INSIDE = [
  { title: "Телеметрия", detail: "Заряд, координаты, скорость, ошибки устройств." },
  { title: "Логи решений", detail: "Полный журнал команд AI-движка и их контекста." },
  { title: "AI-модели", detail: "Локальные модели внутри контура, без внешних вызовов." },
  { title: "Данные устройств", detail: "Профили, кадры камер, история задач и исполнения." },
];

const COMPARE: { row: string; cloud: string; onprem: string }[] = [
  { row: "Где работает", cloud: "Облако Mevratek", onprem: "Внутри инфраструктуры заказчика" },
  { row: "Данные и телеметрия", cloud: "В облаке платформы", onprem: "Не покидают контур предприятия" },
  { row: "AI-модели", cloud: "Облачные / российские LLM", onprem: "Локальные модели (Ollama, vLLM, LM Studio)" },
  { row: "Внешние API-запросы", cloud: "Есть (к провайдеру модели)", onprem: "Отсутствуют — закрытый контур" },
  { row: "API · SDK · протокол", cloud: "Единые", onprem: "Те же самые, без изменений" },
  { row: "Кому подходит", cloud: "Большинству команд", onprem: "Требованиям к безопасности данных" },
];

export default function OnPremisePage() {
  return (
    <>
      {/* Hero */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading
            eyebrow="Развёртывание · Enterprise"
            title="Mevratek On-Premise — платформа в вашем контуре"
            intro="Возможность развернуть платформу полностью внутри инфраструктуры заказчика. Данные, модели, телеметрия и управление роботами остаются в закрытом контуре предприятия — при том же API, SDK и протоколе, что и в облаке."
          />
        </Container>
      </Section>

      {/* For whom */}
      <Section className="!pt-0">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <SectionHeading eyebrow="Для кого" title="Когда данные не должны покидать периметр" />
            <div className="space-y-6 text-lg leading-relaxed text-ink-soft">
              <p>
                On-Premise рассчитан на организации с повышенными требованиями к
                безопасности данных: предприятия с закрытыми контурами, критическую
                инфраструктуру и производства, смежные с ОПК, где отправка
                телеметрии, изображений и данных о процессе во внешнее облако
                недопустима.
              </p>
              <p>
                Такие заказчики получают все возможности платформы — управление
                парком, движок решений, память, симулятор — но{" "}
                <strong>полностью внутри своей инфраструктуры.</strong>
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* What stays inside */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Что остаётся внутри"
            title="Всё — в закрытом контуре"
            intro="При локальном развёртывании ни один класс данных не уходит наружу:"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INSIDE.map((c) => (
              <div key={c.title} className="rounded-xl border border-line bg-white p-6">
                <div className="text-base font-semibold text-ink">{c.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.detail}</p>
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
              eyebrow="Локальный AI"
              title="AI-модели без внешних запросов"
              intro="Движок решений провайдер-независим. В контуре предприятия он работает с локальными моделями через OpenAI-совместимый шлюз (Ollama, vLLM, LM Studio) — все вычисления остаются внутри, ни один запрос не уходит во внешние сервисы."
            />
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="space-y-3 text-sm">
                {[
                  ["Провайдер модели", "локальный / OpenAI-совместимый"],
                  ["Внешние вызовы", "нет"],
                  ["Хранилище данных", "внутреннее (Postgres, S3-совместимое)"],
                  ["Присутствие устройств", "в локальной БД, без внешних кэшей"],
                ].map(([k, v]) => (
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

      {/* Comparison */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Сравнение"
            title="Облако и On-Premise"
            intro="Один и тот же продукт в двух вариантах поставки. Интерфейс, API, SDK и протокол идентичны — отличается только место развёртывания и контроль над данными."
          />
          <div className="mt-10 overflow-x-auto">
            <div className="min-w-[640px] overflow-hidden rounded-2xl border border-line bg-white">
              <div className="grid grid-cols-3 border-b border-line bg-surface text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                <div className="p-4" />
                <div className="p-4">Mevratek Cloud</div>
                <div className="p-4">Mevratek On-Premise</div>
              </div>
              {COMPARE.map((r) => (
                <div
                  key={r.row}
                  className="grid grid-cols-3 border-b border-line text-sm last:border-0"
                >
                  <div className="p-4 font-medium text-ink">{r.row}</div>
                  <div className="p-4 text-muted">{r.cloud}</div>
                  <div className="p-4 text-ink-soft">{r.onprem}</div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Status */}
      <Section>
        <Container>
          <SectionHeading eyebrow="Статус" title="Что доступно сейчас" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-7">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-signal">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" /> Доступно
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Базовое локальное развёртывание уже работает: платформа
                разворачивается контейнерами, использует локальные модели через
                OpenAI-совместимый шлюз и не требует обязательных внешних сервисов.
                Тот же API, SDK и протокол, что и в облаке.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-7">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> В дорожной
                карте
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Коробочная поставка <strong>Mevratek Enterprise On-Premise</strong>{" "}
                — единый инсталлятор, работа в air-gapped-среде, лицензирование и
                сопровождение — в планах развития на 2026–2027 в рамках
                промышленных пилотов.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section className="!pt-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center text-white sm:py-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">
              Нужен деплой в закрытом контуре?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Расскажите о требованиях к безопасности и инфраструктуре — обсудим
              локальное развёртывание под ваш периметр.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/contacts" variant="secondary">
                Обсудить On-Premise <ArrowIcon />
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
