import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon, Button, Container, Section } from "@/components/ui";
import { ArticleJsonLd } from "@/components/schema";
import { POST_SLUGS, getPost, formatDate } from "@/components/blog";

export function generateStaticParams() {
  return POST_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Статья не найдена" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <Section className="pt-14 sm:pt-20">
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        slug={post.slug}
        datePublished={post.date}
      />
      <Container>
        <article className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink"
          >
            <ArrowIcon className="rotate-180" /> Все статьи
          </Link>

          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {post.tag} · {post.readMinutes} мин чтения ·{" "}
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.12] sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{post.lead}</p>

          <div className="mt-10 space-y-10">
            {post.sections.map((s) => (
              <section key={s.h2}>
                <h2 className="text-xl font-semibold text-ink sm:text-2xl">
                  {s.h2}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
                  {s.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <div className="text-lg font-semibold text-ink">
              Хотите подключить своё устройство?
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Расскажите о задаче — предложим сценарий пилота и поможем с
              интеграцией через SDK. Или изучите{" "}
              <Link
                href="/documentation"
                className="font-semibold text-accent hover:text-ink"
              >
                документацию платформы
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/contacts">
                Обсудить пилот <ArrowIcon />
              </Button>
              <Button href="/platform" variant="secondary">
                Как устроена платформа
              </Button>
            </div>
          </div>
        </article>
      </Container>
    </Section>
  );
}
