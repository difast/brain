import type { Metadata } from "next";

import { HomeView, HOME_COPY } from "@/components/views/home";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/", {
  title: HOME_COPY.en.metaTitle,
  description: HOME_COPY.en.metaDescription,
});

export default function EnglishHomePage() {
  return <HomeView locale="en" />;
}
