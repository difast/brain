import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { BreadcrumbJsonLd } from "@/components/schema";

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
          intro="Ответим по существу: предложим сценарий, оценим сроки пилота и поможем с интеграцией через SDK."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="space-y-8">
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
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
