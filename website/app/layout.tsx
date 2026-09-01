import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/schema";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

/**
 * The link preview every messenger, social network and Alice renders.
 *
 * Exported because Next.js replaces `openGraph` wholesale when a page defines
 * its own — it does not merge the images in from here — so every page that
 * sets openGraph has to name this explicitly.
 */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Mevratek — мозг для парка устройств внутри вашего контура",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mevratek — платформа управления роботами в вашем контуре",
    template: "%s · Mevratek",
  },
  description:
    "Российская платформа управления промышленными роботами и автономными устройствами. Разворачивается в контуре заказчика: единый SDK и API, телеметрия в реальном времени и команды AI-движка на базе российских языковых моделей.",
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
  applicationName: "Mevratek",
  authors: [{ name: "Mevratek" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Mevratek",
    title: "Mevratek — платформа управления роботами в вашем контуре",
    description:
      "Подключите любое автономное устройство через единый SDK и API. Телеметрия в реальном времени и структурированные команды AI-движка на базе российских LLM — всё внутри периметра предприятия.",
    url: siteUrl,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mevratek — платформа управления роботами в вашем контуре",
    description:
      "Единый протокол для промышленного робота, складской тележки и симулятора. AI-движок на базе российских языковых моделей, развёрнутый на вашей инфраструктуре.",
    images: [OG_IMAGE.url],
  },
  robots: { index: true, follow: true },
  verification: { yandex: "ce336c8c62e979fc" },
};

/**
 * Paints the phone's browser chrome in the site's colour instead of the default
 * white, which is the difference between the page looking like an application
 * and looking like a document.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a24" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          К содержимому
        </a>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
