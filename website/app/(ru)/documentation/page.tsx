import type { Metadata } from "next";

import { DocumentationView, DOCS_COPY } from "@/components/views/documentation";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/documentation", {
  title: DOCS_COPY.ru.metaTitle,
  description: DOCS_COPY.ru.metaDescription,
});

export default function DocumentationPage() {
  return <DocumentationView locale="ru" />;
}
