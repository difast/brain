import type { Metadata } from "next";

import { ForWhoView, FOR_WHO_COPY } from "@/components/views/for-who";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/for-who", {
  title: FOR_WHO_COPY.ru.metaTitle,
  description: FOR_WHO_COPY.ru.metaDescription,
  ogTitle: FOR_WHO_COPY.ru.ogTitle,
});

export default function ForWhoPage() {
  return <ForWhoView locale="ru" />;
}
