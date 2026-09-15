import type { Metadata } from "next";

import { McpView, MCP_COPY } from "@/components/views/mcp";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/mcp", {
  title: MCP_COPY.en.metaTitle,
  description: MCP_COPY.en.metaDescription,
  ogTitle: MCP_COPY.en.ogTitle,
});

export default function McpPage() {
  return <McpView locale="en" />;
}
