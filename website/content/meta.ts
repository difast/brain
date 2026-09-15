import type { Metadata } from "next";

import { OG_IMAGE } from "@/components/og";
import { localePath, type Locale } from "@/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

const SITE = {
  ru: {
    titleDefault: "Mevratek — платформа управления роботами в вашем контуре",
    titleTemplate: "%s · Mevratek",
    description:
      "Российская платформа управления промышленными роботами и автономными " +
      "устройствами. Разворачивается в контуре заказчика: единый SDK и API, " +
      "телеметрия в реальном времени и команды AI-движка на базе российских " +
      "языковых моделей.",
    ogTitle: "Mevratek — платформа управления роботами в вашем контуре",
    ogDescription:
      "Подключите любое автономное устройство через единый SDK и API. " +
      "Телеметрия в реальном времени и структурированные команды AI-движка на " +
      "базе российских LLM — всё внутри периметра предприятия.",
    twitterDescription:
      "Единый протокол для промышленного робота, складской тележки и " +
      "симулятора. AI-движок на базе российских языковых моделей, развёрнутый " +
      "на вашей инфраструктуре.",
    keywords: [
      "управление роботами",
      "on-premise платформа роботы",
      "платформа управления роботами",
      "робототехника",
      "автономные устройства",
      "YandexGPT",
      "GigaChat",
      "SDK для роботов",
      "Mevratek",
    ],
    ogLocale: "ru_RU",
  },
  en: {
    titleDefault: "Mevratek — robot fleet control inside your own perimeter",
    titleTemplate: "%s · Mevratek",
    description:
      "A platform for controlling industrial robots and autonomous devices, " +
      "deployed inside the customer's own perimeter: one SDK and API, " +
      "real-time telemetry, and action commands from an AI engine that runs " +
      "on the model you choose.",
    ogTitle: "Mevratek — robot fleet control inside your own perimeter",
    ogDescription:
      "Connect any autonomous device through one SDK and API. Real-time " +
      "telemetry and structured commands from an AI decision engine — all " +
      "inside the enterprise perimeter.",
    twitterDescription:
      "One protocol for an industrial robot, a warehouse cart and a " +
      "simulator. An AI decision engine running on your own infrastructure.",
    keywords: [
      "robot fleet management",
      "on-premise robotics platform",
      "robot control platform",
      "autonomous devices",
      "robotics SDK",
      "AI decision engine",
      "LLM robotics",
      "Mevratek",
    ],
    ogLocale: "en_US",
  },
} satisfies Record<Locale, Record<string, unknown>>;

/** Site-wide metadata for one locale, used by that locale's root layout. */
export function rootMetadata(locale: Locale): Metadata {
  const copy = SITE[locale];
  const home = localePath(locale, "/");
  return {
    metadataBase: new URL(siteUrl),
    title: { default: copy.titleDefault, template: copy.titleTemplate },
    description: copy.description,
    keywords: copy.keywords,
    applicationName: "Mevratek",
    authors: [{ name: "Mevratek" }],
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: home,
      languages: {
        ru: localePath("ru", "/"),
        en: localePath("en", "/"),
        "x-default": localePath("ru", "/"),
      },
    },
    openGraph: {
      type: "website",
      locale: copy.ogLocale,
      siteName: "Mevratek",
      title: copy.ogTitle,
      description: copy.ogDescription,
      url: `${siteUrl}${home === "/" ? "" : home}`,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.ogTitle,
      description: copy.twitterDescription,
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
    // Search Console ownership. Only needs to be on one locale, but costs
    // nothing on both and survives whichever page a crawler lands on first.
    verification: { yandex: "ce336c8c62e979fc" },
  };
}

/**
 * Per-page metadata: title, description, and the hreflang pair for the route.
 *
 * Every page that sets `openGraph` must name the image again — Next replaces
 * the parent's openGraph rather than merging into it — so that is done here
 * once instead of being forgotten on a page.
 */
export function pageMetadata(
  locale: Locale,
  path: string,
  copy: { title: string; description: string; ogTitle?: string },
): Metadata {
  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: localePath(locale, path),
      languages: {
        ru: localePath("ru", path),
        en: localePath("en", path),
        "x-default": localePath("ru", path),
      },
    },
    openGraph: {
      title: copy.ogTitle ?? copy.title,
      description: copy.description,
      url: localePath(locale, path),
      locale: SITE[locale].ogLocale,
      images: [OG_IMAGE],
    },
  };
}
