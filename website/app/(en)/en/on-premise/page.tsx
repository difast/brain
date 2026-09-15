import type { Metadata } from "next";

import { OnPremiseView, ON_PREMISE_COPY } from "@/components/views/on-premise";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/on-premise", {
  title: ON_PREMISE_COPY.en.metaTitle,
  description: ON_PREMISE_COPY.en.metaDescription,
  ogTitle: ON_PREMISE_COPY.en.ogTitle,
});

export default function OnPremisePage() {
  return <OnPremiseView locale="en" />;
}
