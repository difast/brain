import type { Metadata } from "next";

import { DocumentationView, DOCS_COPY } from "@/components/views/documentation";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/documentation", {
  title: DOCS_COPY.en.metaTitle,
  description: DOCS_COPY.en.metaDescription,
});

export default function DocumentationPage() {
  return <DocumentationView locale="en" />;
}
