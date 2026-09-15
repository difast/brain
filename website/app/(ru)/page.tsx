import type { Metadata } from "next";

import { HomeView, HOME_COPY } from "@/components/views/home";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/", {
  title: HOME_COPY.ru.metaTitle,
  description: HOME_COPY.ru.metaDescription,
});

export default function HomePage() {
  return <HomeView locale="ru" />;
}
