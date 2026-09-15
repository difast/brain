/**
 * Copy for the chrome that wraps every page: header, footer, shared labels.
 *
 * Typed modules rather than message catalogues, because that is how this site
 * already stores content (see components/content.ts) and because a missing
 * translation is then a build error instead of a raw key shown to a visitor.
 */

import type { Dict, Locale } from "@/i18n/config";

const STRINGS = {
  skipToContent: { ru: "К содержимому", en: "Skip to content" },
  ctaConnect: { ru: "Подключить устройство", en: "Connect a device" },
  openMenu: { ru: "Открыть меню", en: "Open menu" },
  closeMenu: { ru: "Закрыть меню", en: "Close menu" },
  language: { ru: "Язык", en: "Language" },
  homeAria: { ru: "Mevratek — на главную", en: "Mevratek — home" },
  home: { ru: "Главная", en: "Home" },
  footerBlurb: {
    ru:
      "Российская платформа управления промышленными роботами и автономными " +
      "устройствами. Единый SDK, телеметрия в реальном времени и " +
      "структурированные команды AI-движка. Разворачивается в контуре заказчика.",
    en:
      "A Russian platform for controlling industrial robots and autonomous " +
      "devices. One SDK, real-time telemetry and structured commands from an " +
      "AI engine — deployed inside the customer's own perimeter.",
  },
  rights: { ru: "Все права защищены.", en: "All rights reserved." },
  madeIn: {
    ru: "Сделано в России · AI Decision Engine",
    en: "Made in Russia · AI Decision Engine",
  },
} satisfies Record<string, Dict>;

export type UiKey = keyof typeof STRINGS;

export function t(locale: Locale, key: UiKey): string {
  return STRINGS[key][locale];
}

export const NAV: { href: string; label: Dict }[] = [
  { href: "/platform", label: { ru: "Платформа", en: "Platform" } },
  { href: "/on-premise", label: { ru: "Развёртывание", en: "Deployment" } },
  { href: "/protocol", label: { ru: "Протокол", en: "Protocol" } },
  { href: "/for-who", label: { ru: "Для кого", en: "Who it's for" } },
  { href: "/about", label: { ru: "О проекте", en: "About" } },
  { href: "/contacts", label: { ru: "Контакты", en: "Contact" } },
];

export const FOOTER_COLUMNS: {
  title: Dict;
  links: { href: string; label: Dict }[];
}[] = [
  {
    title: { ru: "Продукт", en: "Product" },
    links: [
      { href: "/platform", label: { ru: "Платформа", en: "Platform" } },
      { href: "/protocol", label: { ru: "Mevratek Protocol", en: "Mevratek Protocol" } },
      { href: "/on-premise", label: { ru: "On-Premise", en: "On-Premise" } },
      { href: "/documentation", label: { ru: "Документация", en: "Documentation" } },
      { href: "/platform#simulator", label: { ru: "Симулятор", en: "Simulator" } },
    ],
  },
  {
    title: { ru: "Компания", en: "Company" },
    links: [
      { href: "/about", label: { ru: "О проекте", en: "About" } },
      { href: "/for-who", label: { ru: "Для кого", en: "Who it's for" } },
      { href: "/blog", label: { ru: "Блог", en: "Blog" } },
      { href: "/materials", label: { ru: "Материалы", en: "Materials" } },
      { href: "/contacts", label: { ru: "Контакты", en: "Contact" } },
    ],
  },
  {
    title: { ru: "Разработчикам", en: "Developers" },
    links: [
      { href: "/mcp", label: { ru: "MCP-коннектор", en: "MCP connector" } },
      { href: "/documentation", label: { ru: "API и SDK", en: "API and SDKs" } },
    ],
  },
  {
    title: { ru: "Документы", en: "Legal" },
    links: [
      {
        href: "/privacy",
        label: { ru: "Политика конфиденциальности", en: "Privacy notice" },
      },
      {
        href: "/privacy-policy",
        label: { ru: "Privacy Policy (MCP)", en: "Privacy Policy (MCP)" },
      },
      {
        href: "/consent",
        label: { ru: "Согласие на обработку ПД", en: "Consent to data processing" },
      },
    ],
  },
];
