import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/schema";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

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
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Mevratek",
    title: "Mevratek — платформа управления роботами в вашем контуре",
    description:
      "Подключите любое автономное устройство через единый SDK и API. Телеметрия в реальном времени и структурированные команды AI-движка на базе российских LLM — всё внутри периметра предприятия.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Mevratek — платформа управления роботами в вашем контуре",
    description:
      "Единый протокол для промышленного робота, складской тележки и симулятора. AI-движок на базе российских языковых моделей, развёрнутый на вашей инфраструктуре.",
  },
  robots: { index: true, follow: true },
  verification: { yandex: "ce336c8c62e979fc" },
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
