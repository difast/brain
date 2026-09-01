import type { Metadata } from "next";
import {
  Button,
  Container,
  Section,
  SectionHeading,
  ArrowIcon,
} from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/schema";
import { Compliance } from "@/components/compliance";

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

const COMPARE: { row: string; pilot: string; prod: string }[] = [
  { row: "Где работает", pilot: "Тестовый сервер — ваш или наш", prod: "Внутри инфраструктуры заказчика" },
  { row: "Данные и телеметрия", pilot: "Тестовые устройства и симулятор", prod: "Боевой парк, данные не покидают контур" },
  { row: "AI-модели", pilot: "Российские LLM по API или локальные", prod: "Локальные модели (Ollama, vLLM, LM Studio)" },
  { row: "Внешние запросы", pilot: "Допустимы к провайдеру модели", prod: "Отсутствуют — закрытый контур" },
  { row: "API · SDK · протокол", pilot: "Единые", prod: "Те же самые, без изменений" },
  { row: "Срок", pilot: "От одного дня до первого устройства", prod: "По графику внедрения" },
];

/** Как проходит работа с заказчиком — от заявки до промышленного внедрения. */
const STEPS = [
  {
    title: "Заявка",
    detail:
      "Вы описываете парк устройств и требования к контуру. Отвечаем в течение рабочего дня.",
  },
  {
    title: "Демонстрация и оценка контура",
    detail:
      "Показываем платформу в работе, разбираем вашу инфраструктуру и требования безопасности.",
  },
  {
    title: "Пилот",
    detail:
      "Разворачиваем стенд и подключаем ограниченный парк. Проверяем сценарии на ваших задачах.",
  },
  {
    title: "Внедрение",
    detail:
      "Развёртывание в промышленном контуре, лицензия и сопровождение по договору.",
  },
];

export default function OnPremisePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "On-Premise", url: "/on-premise" },
        ]}
      />
      {/* Hero */}
      <Section className="pt-14 sm:pt-16">
        <Container>
          <SectionHeading
            eyebrow="Развёртывание · Enterprise"
            title="Mevratek On-Premise — платформа в вашем контуре"
            intro="Mevratek поставляется как решение для закрытого контура: платформа разворачивается полностью внутри инфраструктуры заказчика. Данные, модели, телеметрия и управление роботами не покидают периметр предприятия. Внешнего облачного сервиса, в который уходила бы телеметрия, у нас нет — это единственная модель поставки."
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

      <Compliance />

      {/* Comparison */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Этапы"
            title="Пилот и промышленный контур"
            intro="Один и тот же продукт на двух этапах внедрения. Интерфейс, API, SDK и протокол идентичны — отличается масштаб парка и жёсткость требований к изоляции."
          />
          <div className="mt-10 overflow-x-auto">
            <div className="min-w-[640px] overflow-hidden rounded-2xl border border-line bg-white">
              <div className="grid grid-cols-3 border-b border-line bg-surface text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                <div className="p-4" />
                <div className="p-4">Пилот</div>
                <div className="p-4">Промышленный контур</div>
              </div>
              {COMPARE.map((r) => (
                <div
                  key={r.row}
                  className="grid grid-cols-3 border-b border-line text-sm last:border-0"
                >
                  <div className="p-4 font-medium text-ink">{r.row}</div>
                  <div className="p-4 text-muted">{r.pilot}</div>
                  <div className="p-4 text-ink-soft">{r.prod}</div>
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
                Тот же API, SDK и протокол, что и на пилотном стенде.
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

      {/* How we work */}
      <Section className="bg-surface">
        <Container>
          <SectionHeading
            eyebrow="Как мы работаем"
            title="От заявки до промышленного внедрения"
            intro="Мы не продаём подписку на внешний сервис — поставка идёт по договору, под конкретный парк и контур. Поэтому путь начинается с разговора, а не с прайс-листа."
          />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="rounded-2xl border border-line bg-white p-6"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-strong text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <div className="mt-4 text-base font-semibold text-ink">
                  {step.title}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-line bg-white p-7">
            <div className="text-base font-semibold text-ink">
              Условия поставки
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
              Поставка осуществляется по договору, оплата — по счёту для
              юридических лиц. Стоимость зависит от размера парка устройств,
              контура развёртывания и объёма сопровождения, поэтому определяется
              индивидуально по итогам оценки. Публичного прайс-листа и
              самостоятельной регистрации нет: доступ к платформе открывается
              после заключения договора.
            </p>
          </div>
        </Container>
      </Section>

      {/* CTA */}
      <Section className="!pt-0">
        <Container>
          <div className="rounded-[72px] border border-line bg-accent-strong px-6 py-12 text-center text-white sm:py-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
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
