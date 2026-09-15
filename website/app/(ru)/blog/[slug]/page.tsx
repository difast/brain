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
  if (!post) return { title: BLOG_COPY.ru.notFound };
  const meta = pageMetadata("ru", `/blog/${post.slug}`, {
    title: post.title.ru,
    description: post.description.ru,
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
  return <BlogPostView locale="ru" slug={params.slug} />;
}
