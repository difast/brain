import type { Metadata } from "next";

import { PrivacyView, PRIVACY_COPY } from "@/components/views/privacy";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = {
  ...pageMetadata("en", "/privacy", {
    title: PRIVACY_COPY.en.metaTitle,
    description: PRIVACY_COPY.en.metaDescription,
  }),
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyView locale="en" />;
}
