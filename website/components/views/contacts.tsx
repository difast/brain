import Link from "next/link";

import { Container, Section, SectionHeading } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { BreadcrumbJsonLd } from "@/components/schema";
import { HandoutQr } from "@/components/qr";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const CONTACTS_COPY = {
  ru: {
    metaTitle: "Контакты",
    metaDescription:
      "Свяжитесь с командой Mevratek — для партнёрств, пилотных проектов и прессы. Подключение автономного устройства через единый SDK и AI-движок.",
    ogTitle: "Контакты Mevratek",
    crumb: "Контакты",
    eyebrow: "Контакты",
    title: "Расскажите о вашей задаче",
    intro:
      "Ответим по существу: предложим сценарий, оценим контур развёртывания и сроки пилота, поможем с интеграцией через SDK.",
    channels: [
      [
        "Пилотные проекты",
        "Подключим ваше устройство и предложим сценарий пилота. Первый результат — за дни.",
      ],
      [
        "Партнёрства",
        "Интеграторам и производителям железа — единый слой управления для всех проектов.",
      ],
      [
        "Пресса",
        "Комментарии, материалы и данные о рынке отечественной робототехники.",
      ],
      [
        "Условия поставки",
        "Платформа разворачивается в вашем контуре и поставляется по договору, оплата — по счёту для юридических лиц. Стоимость зависит от размера парка и контура развёртывания, поэтому считается индивидуально.",
      ],
    ],
    mail: "Почта",
    pdfTitle: "Обзор платформы в PDF",
    pdfBefore:
      "Две страницы: архитектура, компоненты и что даёт развёртывание в вашем контуре. Наведите камеру или откройте ",
    pdfLink: "страницу материалов",
    pdfAfter: ".",
  },
  en: {
    metaTitle: "Contact",
    metaDescription:
      "Get in touch with the Mevratek team — about partnerships, pilot projects and press. Connect an autonomous device through one SDK and an AI decision engine.",
    ogTitle: "Contact Mevratek",
    crumb: "Contact",
    eyebrow: "Contact",
    title: "Tell us about your task",
    intro:
      "We reply with substance: a suggested scenario, an assessment of the deployment perimeter and the pilot timeline, and help with the SDK integration.",
    channels: [
      [
        "Pilot projects",
        "We will connect your device and propose a pilot. The first result takes days, not months.",
      ],
      [
        "Partnerships",
        "For integrators and hardware manufacturers: one control layer across every project.",
      ],
      [
        "Press",
        "Comment, materials and data on the Russian robotics market.",
      ],
      [
        "Commercial terms",
        "The platform is deployed in your own perimeter and delivered under contract, invoiced to a legal entity. The price depends on the size of the fleet and the deployment perimeter, so it is quoted individually.",
      ],
    ],
    mail: "Email",
    pdfTitle: "Platform overview (PDF)",
    pdfBefore:
      "Two pages: the architecture, the components, and what a deployment in your own perimeter gives you. Point a camera at the code, or open the ",
    pdfLink: "materials page",
    pdfAfter: ".",
  },
} as const;

export function ContactsView({ locale }: { locale: Locale }) {
  const c = CONTACTS_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <Section className="pt-14 sm:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/contacts") },
        ]}
      />
      <Container>
        <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />

        {/* On a phone the columns stack, and the form used to land after four
            channel blocks, the email and the QR card — six screens of scrolling
            before the only action this page exists for. The order flips below
            lg so the form comes first; on wide screens the reading column is
            still on the left where it belongs. */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="order-2 space-y-8 lg:order-1">
            {c.channels.map(([title, detail]) => (
              <div key={title} className="border-t border-line pt-5">
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
              </div>
            ))}
            <div className="border-t border-line pt-5">
              <h3 className="text-base font-semibold text-ink">{c.mail}</h3>
              <a
                href="mailto:info@mevratek.ru"
                className="mt-2 inline-block text-sm font-semibold text-accent hover:text-ink"
              >
                info@mevratek.ru
              </a>
            </div>

            {/* Before writing, most people want to read. The code goes to the
                same two-page PDF we hand out at events — scanning it off the
                screen is faster than dictating an address across a table. */}
            <div className="border-t border-line pt-5">
              <h3 className="text-base font-semibold text-ink">{c.pdfTitle}</h3>
              {/* 132px is not a design choice: the code is 33 modules across
                  including its quiet zone, and below ~4 device pixels per
                  module a phone camera stops resolving it. A QR nobody can
                  scan is decoration. */}
              <div className="mt-4 flex items-start gap-4">
                <div className="shrink-0 rounded-lg border border-line bg-white p-2">
                  <HandoutQr className="block h-[132px] w-[132px]" />
                </div>
                <div>
                  <p className="text-sm leading-relaxed text-muted">
                    {c.pdfBefore}
                    <Link
                      href={p("/materials")}
                      className="font-semibold text-accent hover:text-ink"
                    >
                      {c.pdfLink}
                    </Link>
                    {c.pdfAfter}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <ContactForm locale={locale} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
