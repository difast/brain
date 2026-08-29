// Schema.org structured data (JSON-LD) for search engines and AI crawlers.

import { COMPANY } from "./company";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is trusted, static content authored here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organization — the legal entity behind Mevratek. Site-wide. */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: COMPANY.brand,
        legalName: COMPANY.legalName,
        url: SITE_URL,
        email: COMPANY.email,
        logo: `${SITE_URL}/icon.svg`,
        description:
          "Российская облачная платформа управления промышленными роботами и автономными устройствами через единый протокол и AI-движок.",
        foundingDate: "2025",
        address: {
          "@type": "PostalAddress",
          addressCountry: "RU",
          addressLocality: "Москва",
          streetAddress: COMPANY.address,
        },
        identifier: [
          { "@type": "PropertyValue", propertyID: "ОГРН", value: COMPANY.ogrn },
          { "@type": "PropertyValue", propertyID: "ИНН", value: COMPANY.inn },
        ],
        areaServed: "RU",
        sameAs: [] as string[],
      }}
    />
  );
}

/** WebSite — enables sitelinks / site name in search. Site-wide. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: COMPANY.brand,
        url: SITE_URL,
        inLanguage: "ru-RU",
        publisher: { "@type": "Organization", name: COMPANY.brand },
      }}
    />
  );
}

/** SoftwareApplication — the Mevratek platform itself. */
export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Mevratek",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Robotics Control Platform",
        operatingSystem: "Web, Linux (on-premise)",
        url: SITE_URL,
        inLanguage: "ru-RU",
        description:
          "Облачная платформа-«мозг» для парка автономных устройств: единый SDK и API, телеметрия в реальном времени и структурированные команды от AI Decision Engine на базе YandexGPT, GigaChat, Claude и локальных моделей. Поддерживает локальное (on-premise) развёртывание.",
        featureList: [
          "Единый протокол управления любым устройством (Device Abstraction Layer)",
          "AI Decision Engine с выбором модели (YandexGPT, GigaChat, Claude, локальные)",
          "Телеметрия в реальном времени",
          "Движок задач и журнал решений",
          "SDK для Python, C++, C, Go, JavaScript",
          "On-premise / изолированное развёртывание",
        ],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "RUB",
          description: "Пилотное подключение — обсуждается индивидуально.",
        },
        publisher: { "@type": "Organization", name: COMPANY.brand },
      }}
    />
  );
}

/** Article — for a single blog post. */
export function ArticleJsonLd({
  title,
  description,
  slug,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
}) {
  const url = `${SITE_URL}/blog/${slug}`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        inLanguage: "ru-RU",
        datePublished,
        dateModified: dateModified ?? datePublished,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        author: { "@type": "Organization", name: COMPANY.brand },
        publisher: {
          "@type": "Organization",
          name: COMPANY.brand,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/icon.svg`,
          },
        },
      }}
    />
  );
}

/** TechArticle — for the documentation page. */
export function TechArticleJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        description,
        inLanguage: "ru-RU",
        url: `${SITE_URL}${path}`,
        author: { "@type": "Organization", name: COMPANY.brand },
        publisher: { "@type": "Organization", name: COMPANY.brand },
      }}
    />
  );
}
