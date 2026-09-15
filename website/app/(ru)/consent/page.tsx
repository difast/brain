import type { Metadata } from "next";

import { ConsentView, CONSENT_COPY } from "@/components/views/consent";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = {
  ...pageMetadata("ru", "/consent", {
    title: CONSENT_COPY.ru.metaTitle,
    description: CONSENT_COPY.ru.metaDescription,
  }),
  robots: { index: true, follow: true },
};

export default function ConsentPage() {
  return <ConsentView locale="ru" />;
}
