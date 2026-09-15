import type { Metadata } from "next";

import { ProtocolView, PROTOCOL_COPY } from "@/components/views/protocol";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/protocol", {
  title: PROTOCOL_COPY.en.metaTitle,
  description: PROTOCOL_COPY.en.metaDescription,
  ogTitle: PROTOCOL_COPY.en.ogTitle,
});

export default function ProtocolPage() {
  return <ProtocolView locale="en" />;
}
