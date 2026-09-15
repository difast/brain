// Schema.org structured data (JSON-LD) for search engines and AI crawlers.

import { COMPANY } from "./company";
import { FOUNDER, FOUNDER_SAME_AS } from "./founder";
import { defaultLocale, htmlLang, localePath, type Locale } from "@/i18n/config";

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

const ORG_DESCRIPTION: Record<Locale, string> = {
  ru: "Российская платформа управления промышленными роботами и автономными устройствами через единый протокол и AI-движок. Разворачивается в контуре заказчика (on-premise).",
  en: "A platform for controlling industrial robots and autonomous devices through one protocol and an AI decision engine, deployed inside the customer's own perimeter (on-premise).",
};

/** Organization — the legal entity behind Mevratek. Site-wide. */
export function OrganizationJsonLd({
  locale = defaultLocale,
}: {
  locale?: Locale;
} = {}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: COMPANY.brand,
        legalName: COMPANY.legalName,
        url: SITE_URL,
        email: COMPANY.email,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon-512.png`,
          width: 512,
          height: 512,
        },
        image: `${SITE_URL}/og.png`,
        description: ORG_DESCRIPTION[locale],
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
        // У самого бренда публичных аккаунтов нет; личные аккаунты основателя
        // висят на Person ниже, а не на юрлице — иначе поисковик свяжет
        // профили человека с организацией и покажет их в её карточке.
        sameAs: [] as string[],
        founder: {
          "@type": "Person",
          "@id": `${SITE_URL}/about#founder`,
          name: FOUNDER.name,
        },
      }}
    />
  );
}

/**
 * Person — основатель.
 *
 * Смысл именно в `sameAs`: это тот список, по которому поисковики и ИИ-краулеры
 * склеивают упоминания имени в разных местах в одного человека. Без него
 * «Дмитрий Пятаков» на сайте и «Дмитрий Пятаков» в соцсетях остаются для
 * машины двумя разными людьми.
 *
 * Ставится на странице «О проекте», где эти же имя, проекты и ссылки есть в
 * видимом тексте: разметка, которой не соответствует ничего на странице,
 * поисковиками игнорируется, а в худшем случае считается манипуляцией.
 */
export function FounderJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `${SITE_URL}/about#founder`,
        name: FOUNDER.name,
        alternateName: FOUNDER.nameLatin,
        givenName: FOUNDER.givenName,
        familyName: FOUNDER.familyName,
        jobTitle: FOUNDER.jobTitle,
        url: `${SITE_URL}/about`,
        nationality: { "@type": "Country", name: "RU" },
        worksFor: {
          "@type": "Organization",
          name: COMPANY.brand,
          legalName: COMPANY.legalName,
          url: SITE_URL,
        },
        founderOf: FOUNDER.projects.map((project) => ({
          "@type": "Organization",
          name: project.name,
          description: project.note,
        })),
        sameAs: FOUNDER_SAME_AS,
      }}
    />
  );
}

/** WebSite — enables sitelinks / site name in search. Site-wide. */
export function WebSiteJsonLd({
  locale = defaultLocale,
}: {
  locale?: Locale;
} = {}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: COMPANY.brand,
        url: `${SITE_URL}${localePath(locale, "/") === "/" ? "" : localePath(locale, "/")}`,
        inLanguage: htmlLang[locale],
        publisher: {
          "@type": "Organization",
          name: COMPANY.brand,
          url: SITE_URL,
          logo: `${SITE_URL}/icon-512.png`,
        },
      }}
    />
  );
}

/** BreadcrumbList — the path from the homepage to the current page. */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${SITE_URL}${item.url}`,
        })),
      }}
    />
  );
}

const APP_COPY: Record<
  Locale,
  { description: string; featureList: string[]; offer: string }
> = {
  ru: {
    description:
      "Платформа-«мозг» для парка автономных устройств: единый SDK и API, телеметрия в реальном времени и структурированные команды AI Decision Engine на базе YandexGPT, GigaChat, Claude и локальных моделей. Разворачивается в закрытом контуре предприятия (on-premise).",
    featureList: [
      "Единый протокол управления любым устройством (Device Abstraction Layer)",
      "AI Decision Engine с выбором модели (YandexGPT, GigaChat, Claude, локальные)",
      "Телеметрия в реальном времени",
      "Движок задач и журнал решений",
      "Официальные SDK для Python, JavaScript, Go, C++ и C",
      "MCP-коннектор для Claude и ChatGPT",
      "Развёртывание в изолированном контуре предприятия",
    ],
    offer:
      "Поставка по договору, оплата по счёту для юридических лиц. Стоимость зависит от размера парка и контура развёртывания.",
  },
  en: {
    description:
      "A brain for a fleet of autonomous devices: one SDK and API, real-time telemetry, and structured commands from an AI Decision Engine running on YandexGPT, GigaChat, Claude or a local model. Deployed inside the enterprise's closed perimeter (on-premise).",
    featureList: [
      "One control protocol for any device (Device Abstraction Layer)",
      "An AI Decision Engine with a choice of model (YandexGPT, GigaChat, Claude, local)",
      "Real-time telemetry",
      "A task engine and a decision journal",
      "Official SDKs for Python, JavaScript, Go, C++ and C",
      "An MCP connector for Claude and ChatGPT",
      "Deployment inside an isolated enterprise perimeter",
    ],
    offer:
      "Delivered under contract and invoiced to a legal entity. The price depends on the size of the fleet and the deployment perimeter.",
  },
};

/** SoftwareApplication — the Mevratek platform itself. */
export function SoftwareApplicationJsonLd({
  locale = defaultLocale,
}: {
  locale?: Locale;
} = {}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Mevratek",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Robotics Control Platform",
        operatingSystem: "Linux (on-premise)",
        url: SITE_URL,
        inLanguage: htmlLang[locale],
        image: `${SITE_URL}/og.png`,
        description: APP_COPY[locale].description,
        featureList: APP_COPY[locale].featureList,
        offers: {
          "@type": "Offer",
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
          description: APP_COPY[locale].offer,
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
  locale = defaultLocale,
}: {
  title: string;
  description: string;
  slug: string;
  datePublished: string;
  dateModified?: string;
  locale?: Locale;
}) {
  const url = `${SITE_URL}${localePath(locale, `/blog/${slug}`)}`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        inLanguage: htmlLang[locale],
        datePublished,
        dateModified: dateModified ?? datePublished,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        url,
        image: [`${SITE_URL}/og.png`],
        author: { "@type": "Organization", name: COMPANY.brand },
        publisher: {
          "@type": "Organization",
          name: COMPANY.brand,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/icon-512.png`,
            width: 512,
            height: 512,
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
  locale = defaultLocale,
}: {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: title,
        description,
        inLanguage: htmlLang[locale],
        url: `${SITE_URL}${localePath(locale, path)}`,
        image: [`${SITE_URL}/og.png`],
        author: { "@type": "Organization", name: COMPANY.brand },
        publisher: { "@type": "Organization", name: COMPANY.brand },
      }}
    />
  );
}
