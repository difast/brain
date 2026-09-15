import type { Metadata } from "next";

import { ConsentView, CONSENT_COPY } from "@/components/views/consent";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = {
  ...pageMetadata("en", "/consent", {
    title: CONSENT_COPY.en.metaTitle,
    description: CONSENT_COPY.en.metaDescription,
  }),
  robots: { index: true, follow: true },
};

export default function ConsentPage() {
  return <ConsentView locale="en" />;
}
