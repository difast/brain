import type { Metadata } from "next";

import { ProtocolView, PROTOCOL_COPY } from "@/components/views/protocol";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/protocol", {
  title: PROTOCOL_COPY.ru.metaTitle,
  description: PROTOCOL_COPY.ru.metaDescription,
  ogTitle: PROTOCOL_COPY.ru.ogTitle,
});

export default function ProtocolPage() {
  return <ProtocolView locale="ru" />;
}
