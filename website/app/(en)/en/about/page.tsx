import type { Metadata } from "next";

import { AboutView, ABOUT_COPY } from "@/components/views/about";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/about", {
  title: ABOUT_COPY.en.metaTitle,
  description: ABOUT_COPY.en.metaDescription,
  ogTitle: ABOUT_COPY.en.ogTitle,
});

export default function AboutPage() {
  return <AboutView locale="en" />;
}
