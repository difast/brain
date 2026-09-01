import type { Metadata } from "next";
import { ArrowIcon, Button, Container, Section, SectionHeading } from "@/components/ui";
import { BreadcrumbJsonLd } from "@/components/schema";
import { HANDOUT_URL, HandoutQr } from "@/components/qr";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Материалы",
  description:
    "Буклет о платформе Mevratek: одна страница A4 — задача, архитектура, компоненты, гарантии развёртывания в контуре заказчика и порядок подключения первого устройства.",
  alternates: { canonical: "/materials" },
  openGraph: {
    title: "Материалы Mevratek",
    description:
      "Буклет о платформе на одной странице: архитектура, компоненты и порядок подключения устройства.",
    url: "/materials",
    images: [OG_IMAGE],
  },
};

/** The file lives in public/; /pdf is a short redirect so the QR stays sparse. */
const FILE = "/mevratek-platform.pdf";

const CONTENTS = [
  {
    page: "Задача",
    title: "Зачем платформа",
    detail:
      "Состояние рынка после ухода западных платформ и путь запроса от устройства до команды: SDK, движок решений, структурированный ответ.",
  },
  {
    page: "Контур",
    title: "Что остаётся у вас",
    detail:
      "152-ФЗ, ноль внешних запросов, локальные модели, разграничение доступа и аудит — что именно даёт развёртывание внутри периметра предприятия.",
  },
  {
    page: "Платформа",
    title: "Из чего она состоит",
    detail:
      "Восемь компонентов, официальные SDK для пяти языков и три шага до первого подключённого устройства.",
  },
];

export default function MaterialsPage() {
  return (
    <Section className="pt-14 sm:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Материалы", url: "/materials" },
        ]}
      />
      <Container>
        <SectionHeading
          eyebrow="Материалы"
          title="Платформа на одной странице"
          intro="Тот же буклет, который мы раздаём на отраслевых мероприятиях. Один лист A4 — печатается на любом принтере без настроек, помещается в папку и читается за минуту."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Button href={FILE}>
                Скачать PDF <ArrowIcon />
              </Button>
              <Button href="/contacts" variant="secondary">
                Обсудить пилот
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">
              PDF · 1 страница · A4 · на русском языке
            </p>

            <div className="mt-10 space-y-6">
              {CONTENTS.map((item) => (
                <div key={item.page} className="border-t border-line pt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {item.page}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-xl text-sm leading-relaxed text-muted">
              Нужен материал под конкретную задачу — состав компонентов, модель
              угроз, оценка контура развёртывания? Напишите на{" "}
              <a
                href="mailto:info@mevratek.ru"
                className="font-semibold text-accent hover:text-ink"
              >
                info@mevratek.ru
              </a>
              , подготовим под ваш случай.
            </p>
          </div>

          {/* The QR matters here as much as the button does: at a stand it is
              faster to let someone scan the screen than to spell out a URL. */}
          <aside className="lg:pl-4">
            <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Наведите камеру
              </div>
              <div className="mt-5 rounded-xl border border-line bg-white p-4">
                <HandoutQr className="mx-auto block h-auto w-full max-w-[220px]" />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Код ведёт на этот же файл. Удобно, когда документ нужен на
                телефоне собеседника — на встрече, на стенде или в переписке.
              </p>
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
