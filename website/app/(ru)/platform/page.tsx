import type { Metadata } from "next";

import { PlatformView, PLATFORM_COPY } from "@/components/views/platform";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/platform", {
  title: PLATFORM_COPY.ru.metaTitle,
  description: PLATFORM_COPY.ru.metaDescription,
  ogTitle: PLATFORM_COPY.ru.ogTitle,
});

export default function PlatformPage() {
  return <PlatformView locale="ru" />;
}
