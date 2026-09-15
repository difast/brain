import type { Metadata } from "next";

import { BlogIndexView, BLOG_COPY } from "@/components/views/blog";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/blog", {
  title: BLOG_COPY.ru.metaTitle,
  description: BLOG_COPY.ru.metaDescription,
});

export default function BlogIndexPage() {
  return <BlogIndexView locale="ru" />;
}
