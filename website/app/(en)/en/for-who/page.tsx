import type { Metadata } from "next";

import { ForWhoView, FOR_WHO_COPY } from "@/components/views/for-who";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/for-who", {
  title: FOR_WHO_COPY.en.metaTitle,
  description: FOR_WHO_COPY.en.metaDescription,
  ogTitle: FOR_WHO_COPY.en.ogTitle,
});

export default function ForWhoPage() {
  return <ForWhoView locale="en" />;
}
