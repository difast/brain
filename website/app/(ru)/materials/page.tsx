import type { Metadata } from "next";

import { MaterialsView, MATERIALS_COPY } from "@/components/views/materials";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/materials", {
  title: MATERIALS_COPY.ru.metaTitle,
  description: MATERIALS_COPY.ru.metaDescription,
  ogTitle: MATERIALS_COPY.ru.ogTitle,
});

export default function MaterialsPage() {
  return <MaterialsView locale="ru" />;
}
