import type { Metadata } from "next";

import { McpView, MCP_COPY } from "@/components/views/mcp";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/mcp", {
  title: MCP_COPY.ru.metaTitle,
  description: MCP_COPY.ru.metaDescription,
  ogTitle: MCP_COPY.ru.ogTitle,
});

export default function McpPage() {
  return <McpView locale="ru" />;
}
