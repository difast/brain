import type { Metadata } from "next";

import { AboutView, ABOUT_COPY } from "@/components/views/about";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/about", {
  title: ABOUT_COPY.ru.metaTitle,
  description: ABOUT_COPY.ru.metaDescription,
  ogTitle: ABOUT_COPY.ru.ogTitle,
});

export default function AboutPage() {
  return <AboutView locale="ru" />;
}
