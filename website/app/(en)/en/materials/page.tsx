import type { Metadata } from "next";

import { MaterialsView, MATERIALS_COPY } from "@/components/views/materials";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/materials", {
  title: MATERIALS_COPY.en.metaTitle,
  description: MATERIALS_COPY.en.metaDescription,
  ogTitle: MATERIALS_COPY.en.ogTitle,
});

export default function MaterialsPage() {
  return <MaterialsView locale="en" />;
}
