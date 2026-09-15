import type { Metadata } from "next";

import { PrivacyView, PRIVACY_COPY } from "@/components/views/privacy";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = {
  ...pageMetadata("ru", "/privacy", {
    title: PRIVACY_COPY.ru.metaTitle,
    description: PRIVACY_COPY.ru.metaDescription,
  }),
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyView locale="ru" />;
}
