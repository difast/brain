import {
  ArrowIcon,
  Button,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { DownloadPdfButton } from "@/components/download-pdf-button";
import { BreadcrumbJsonLd } from "@/components/schema";
import { HANDOUT_URL, HandoutQr } from "@/components/qr";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

/** The file lives in public/; /pdf is a short redirect so the QR stays sparse. */
const FILE = "/mevratek-platform.pdf";

export const MATERIALS_COPY = {
  ru: {
    metaTitle: "Материалы",
    metaDescription:
      "Буклет о платформе Mevratek: одна страница A4 — задача, архитектура, компоненты, гарантии развёртывания в контуре заказчика и порядок подключения первого устройства.",
    ogTitle: "Материалы Mevratek",
    crumb: "Материалы",
    eyebrow: "Материалы",
    title: "Платформа на одной странице",
    intro:
      "Тот же буклет, который мы раздаём на отраслевых мероприятиях. Один лист A4 — печатается на любом принтере без настроек, помещается в папку и читается за минуту.",
    download: "Скачать PDF",
    discuss: "Обсудить пилот",
    note:
      "PDF · 1 страница · A4 · на русском языке. Откроется в новой вкладке и сохранится на устройство.",
    contents: [
      [
        "Задача",
        "Зачем платформа",
        "Состояние рынка после ухода западных платформ и путь запроса от устройства до команды: SDK, движок решений, структурированный ответ.",
      ],
      [
        "Контур",
        "Что остаётся у вас",
        "152-ФЗ, ноль внешних запросов, локальные модели, разграничение доступа и аудит — что именно даёт развёртывание внутри периметра предприятия.",
      ],
      [
        "Платформа",
        "Из чего она состоит",
        "Восемь компонентов, официальные SDK для пяти языков и три шага до первого подключённого устройства.",
      ],
    ],
    customBefore:
      "Нужен материал под конкретную задачу — состав компонентов, модель угроз, оценка контура развёртывания? Напишите на ",
    customAfter: ", подготовим под ваш случай.",
    scan: "Наведите камеру",
    qrNote:
      "Код ведёт на этот же файл. Удобно, когда документ нужен на телефоне собеседника — на встрече, на стенде или в переписке.",
  },
  en: {
    metaTitle: "Materials",
    metaDescription:
      "The Mevratek platform booklet: one A4 page covering the problem, the architecture, the components, what a deployment in the customer's perimeter guarantees, and how the first device gets connected.",
    ogTitle: "Mevratek materials",
    crumb: "Materials",
    eyebrow: "Materials",
    title: "The platform on one page",
    intro:
      "The same booklet we hand out at industry events. One A4 sheet — it prints on any printer without fiddling, fits in a folder and reads in a minute.",
    download: "Download the PDF",
    discuss: "Discuss a pilot",
    note:
      "PDF · 1 page · A4 · in Russian. It opens in a new tab and saves to your device.",
    contents: [
      [
        "The problem",
        "Why the platform exists",
        "The state of the market after the Western platforms left, and the path a request takes from device to command: the SDK, the decision engine, a structured answer.",
      ],
      [
        "The perimeter",
        "What stays with you",
        "Federal Law 152-FZ, zero outbound requests, local models, access control and audit — what a deployment inside the enterprise perimeter actually gives you.",
      ],
      [
        "The platform",
        "What it is made of",
        "Eight components, official SDKs for five languages, and three steps to the first connected device.",
      ],
    ],
    customBefore:
      "Need something for a specific case — a component inventory, a threat model, an assessment of your deployment perimeter? Write to ",
    customAfter: " and we will put it together for you.",
    scan: "Point your camera here",
    qrNote:
      "The code opens the same file. Useful when the document needs to be on the other person's phone — in a meeting, at a stand, or in a chat.",
  },
} as const;

export function MaterialsView({ locale }: { locale: Locale }) {
  const c = MATERIALS_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <Section className="pt-14 sm:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/materials") },
        ]}
      />
      <Container>
        <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <DownloadPdfButton href={FILE} filename="mevratek-platform.pdf">
                {c.download} <ArrowIcon />
              </DownloadPdfButton>
              <Button href={p("/contacts")} variant="secondary">
                {c.discuss}
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">{c.note}</p>

            <div className="mt-10 space-y-6">
              {c.contents.map(([page, title, detail]) => (
                <div key={page} className="border-t border-line pt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {page}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted">
              {c.customBefore}
              <a
                href="mailto:info@mevratek.ru"
                className="font-semibold text-accent hover:text-ink"
              >
                info@mevratek.ru
              </a>
              {c.customAfter}
            </p>
          </div>

          {/* The QR matters here as much as the button does: at a stand it is
              faster to let someone scan the screen than to spell out a URL. */}
          <aside className="lg:pl-4">
            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {c.scan}
              </div>
              <div className="mt-5 rounded-xl border border-line bg-white p-4">
                <HandoutQr className="mx-auto block h-auto w-full max-w-[220px]" />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted">{c.qrNote}</p>
              <a
                href={HANDOUT_URL}
                className="mt-4 inline-block text-sm font-semibold text-accent hover:text-ink"
              >
                mevratek.ru/pdf
              </a>
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
