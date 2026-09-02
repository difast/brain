import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { BreadcrumbJsonLd } from "@/components/schema";
import { HandoutQr } from "@/components/qr";
import Link from "next/link";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Свяжитесь с командой Mevratek — для партнёрств, пилотных проектов и прессы. Подключение автономного устройства через единый SDK и AI-движок.",
  alternates: { canonical: "/contacts" },
  openGraph: {
    title: "Контакты Mevratek",
    description:
      "Партнёрства, пилотные проекты, пресса. Обсудим подключение вашего устройства.",
    url: "/contacts",
    images: [OG_IMAGE],
  },
};

const CHANNELS = [
  {
    title: "Пилотные проекты",
    detail:
      "Подключим ваше устройство и предложим сценарий пилота. Первый результат — за дни.",
  },
  {
    title: "Партнёрства",
    detail:
      "Интеграторам и производителям железа — единый слой управления для всех проектов.",
  },
  {
    title: "Пресса",
    detail:
      "Комментарии, материалы и данные о рынке отечественной робототехники.",
  },
  {
    title: "Условия поставки",
    detail:
      "Платформа разворачивается в вашем контуре и поставляется по договору, оплата — по счёту для юридических лиц. Стоимость зависит от размера парка и контура развёртывания, поэтому считается индивидуально.",
  },
];

export default function ContactsPage() {
  return (
    <Section className="pt-14 sm:pt-16">
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Контакты", url: "/contacts" },
        ]}
      />
      <Container>
        <SectionHeading
          eyebrow="Контакты"
          title="Расскажите о вашей задаче"
          intro="Ответим по существу: предложим сценарий, оценим контур развёртывания и сроки пилота, поможем с интеграцией через SDK."
        />

        {/* On a phone the columns stack, and the form used to land after four
            channel blocks, the email and the QR card — six screens of scrolling
            before the only action this page exists for. The order flips below
            lg so the form comes first; on wide screens the reading column is
            still on the left where it belongs. */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="order-2 space-y-8 lg:order-1">
            {CHANNELS.map((c) => (
              <div key={c.title} className="border-t border-line pt-5">
                <h3 className="text-base font-semibold text-ink">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {c.detail}
                </p>
              </div>
            ))}
            <div className="border-t border-line pt-5">
              <h3 className="text-base font-semibold text-ink">Почта</h3>
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
              <h3 className="text-base font-semibold text-ink">
                Обзор платформы в PDF
              </h3>
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
                    Две страницы: архитектура, компоненты и что даёт
                    развёртывание в вашем контуре. Наведите камеру или откройте{" "}
                    <Link
                      href="/materials"
                      className="font-semibold text-accent hover:text-ink"
                    >
                      страницу материалов
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <ContactForm />
          </div>
        </div>
      </Container>
    </Section>
  );
}
