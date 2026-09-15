import type { Metadata } from "next";

import { PlatformView, PLATFORM_COPY } from "@/components/views/platform";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/platform", {
  title: PLATFORM_COPY.en.metaTitle,
  description: PLATFORM_COPY.en.metaDescription,
  ogTitle: PLATFORM_COPY.en.ogTitle,
});

export default function PlatformPage() {
  return <PlatformView locale="en" />;
}
