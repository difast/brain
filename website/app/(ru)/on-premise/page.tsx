import type { Metadata } from "next";

import { OnPremiseView, ON_PREMISE_COPY } from "@/components/views/on-premise";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/on-premise", {
  title: ON_PREMISE_COPY.ru.metaTitle,
  description: ON_PREMISE_COPY.ru.metaDescription,
  ogTitle: ON_PREMISE_COPY.ru.ogTitle,
});

export default function OnPremisePage() {
  return <OnPremiseView locale="ru" />;
}
