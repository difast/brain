import type { Metadata } from "next";

import { BlogIndexView, BLOG_COPY } from "@/components/views/blog";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/blog", {
  title: BLOG_COPY.en.metaTitle,
  description: BLOG_COPY.en.metaDescription,
});

export default function BlogIndexPage() {
  return <BlogIndexView locale="en" />;
}
