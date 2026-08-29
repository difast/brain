import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mevratek — облачная платформа управления роботами",
    template: "%s · Mevratek",
  },
  description:
    "Российская облачная платформа управления промышленными роботами и автономными устройствами. Единый SDK и API, телеметрия в реальном времени и команды от AI-движка на базе российских языковых моделей.",
  keywords: [
    "управление роботами",
    "облачная платформа роботы",
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
    title: "Mevratek — облачная платформа управления роботами",
    description:
      "Подключите любое автономное устройство через единый SDK и API. Телеметрия в реальном времени и структурированные команды от AI-движка на базе российских LLM.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Mevratek — облачная платформа управления роботами",
    description:
      "Единый протокол для промышленного робота, складской тележки и симулятора. AI-движок на базе российских языковых моделей.",
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
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
