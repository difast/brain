import { Container, Section, SectionHeading } from "@/components/ui";

/**
 * What the on-premise architecture actually guarantees about data and access.
 *
 * Deliberately claims capabilities, not certificates. Attestation against a
 * particular standard is a project-by-project exercise that depends on the
 * customer's own contour, and a badge implying an audit we have not passed
 * would be worse than saying nothing.
 */

type Item = {
  title: string;
  detail: string;
  /** Which shield glyph to draw — see `Glyph` below. */
  icon: "law" | "perimeter" | "models" | "access";
};

const ITEMS: Item[] = [
  {
    icon: "law",
    title: "152-ФЗ «О персональных данных»",
    detail:
      "Персональные данные обрабатываются внутри вашего контура, на вашем оборудовании. Политика обработки и форма согласия опубликованы и применяются к сайту и личному кабинету.",
  },
  {
    icon: "perimeter",
    title: "Данные не покидают периметр",
    detail:
      "Телеметрия, кадры с камер, маршруты и логи решений остаются на серверах предприятия. Трансграничной передачи нет, потому что передавать наружу нечего.",
  },
  {
    icon: "models",
    title: "Российские и локальные модели",
    detail:
      "YandexGPT, GigaChat или модель, поднятая внутри контура. В изолированном режиме внешних запросов не выполняется ни одного — платформа не зависит от зарубежных сервисов.",
  },
  {
    icon: "access",
    title: "Разграничение доступа и аудит",
    detail:
      "Роли администратора и участника, журнал действий по каждому аккаунту, отзыв сессий и ключей API, подтверждение важных операций кодом из письма.",
  },
];

/** A shield outline with a simple mark inside. Drawn, not iconographic. */
function Glyph({ kind }: { kind: Item["icon"] }) {
  const marks: Record<Item["icon"], React.ReactNode> = {
    // Scales — the law.
    law: (
      <>
        <path d="M12 9v6" strokeWidth="1.4" />
        <path d="M9 11h6" strokeWidth="1.4" />
      </>
    ),
    // A closed boundary.
    perimeter: <rect x="9" y="10" width="6" height="5" rx="1" strokeWidth="1.4" />,
    // A node with links — the model.
    models: (
      <>
        <circle cx="12" cy="12.5" r="1.6" strokeWidth="1.4" />
        <path d="M12 9v1.4M12 14.6V16M9.4 12.5h1.2M13.4 12.5h1.2" strokeWidth="1.3" />
      </>
    ),
    // A padlock.
    access: (
      <>
        <rect x="9.5" y="11.8" width="5" height="4" rx="1" strokeWidth="1.4" />
        <path d="M10.8 11.8v-1.2a1.2 1.2 0 0 1 2.4 0v1.2" strokeWidth="1.3" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-11 w-11 text-accent"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M12 3.2l6.5 2.4v5.6c0 4-2.7 7.6-6.5 8.9-3.8-1.3-6.5-4.9-6.5-8.9V5.6L12 3.2z"
        strokeWidth="1.3"
      />
      {marks[kind]}
    </svg>
  );
}

export function Compliance() {
  return (
    <Section className="bg-surface">
      <Container>
        <SectionHeading
          eyebrow="Требования и данные"
          title="Что гарантирует развёртывание в вашем контуре"
          intro="Мы не храним ваши данные — они физически не покидают предприятие. Ниже то, что из этого следует для требований, под которыми вы работаете."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <Glyph kind={item.icon} />
              <div className="mt-4 text-base font-semibold leading-snug text-ink">
                {item.title}
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
          Аттестация под конкретный стандарт — 187-ФЗ о безопасности КИИ,
          отраслевые требования вашей службы безопасности — зависит от контура,
          в котором разворачивается платформа, и прорабатывается в рамках
          проекта. Мы готовы участвовать в этой работе и предоставить описание
          архитектуры, состав компонентов и модель угроз.
        </p>
      </Container>
    </Section>
  );
}
