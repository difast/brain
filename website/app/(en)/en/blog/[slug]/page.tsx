import type { Metadata } from "next";

import { BlogPostView, BLOG_COPY } from "@/components/views/blog";
import { POST_SLUGS, getPost } from "@/components/blog";
import { pageMetadata } from "@/content/meta";

export function generateStaticParams() {
  return POST_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: BLOG_COPY.en.notFound };
  const meta = pageMetadata("en", `/blog/${post.slug}`, {
    title: post.title.en,
    description: post.description.en,
  });
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: post.date },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  return <BlogPostView locale="en" slug={params.slug} />;
}
