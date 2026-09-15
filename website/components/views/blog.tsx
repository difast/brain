import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowIcon,
  Button,
  Card,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui";
import { POSTS, getPost, formatDate } from "@/components/blog";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/schema";
import { t } from "@/content/ui";
import { localePath, type Locale } from "@/i18n/config";

export const BLOG_COPY = {
  ru: {
    metaTitle: "Блог",
    metaDescription:
      "Статьи о платформе Mevratek: архитектура централизованного управления роботами, российские LLM в робототехнике и on-premise развёртывание в закрытом контуре.",
    crumb: "Блог",
    eyebrow: "Блог",
    title: "Идеи и практика управления автономными устройствами",
    intro:
      "Как устроена платформа, почему движок решений нейтрален к вендору и что нужно для развёртывания в закрытом контуре.",
    minutes: "мин",
    read: "Читать",
    docsBefore: "Техническая справка по протоколу и эндпоинтам собрана в ",
    docsLink: "документации платформы",
    docsAfter: ".",
    notFound: "Статья не найдена",
    allPosts: "Все статьи",
    readTime: "мин чтения",
    ctaTitle: "Хотите подключить своё устройство?",
    ctaBefore:
      "Расскажите о задаче — предложим сценарий пилота и поможем с интеграцией через SDK. Или изучите ",
    ctaLink: "документацию платформы",
    ctaAfter: ".",
    ctaPrimary: "Обсудить пилот",
    ctaSecondary: "Как устроена платформа",
  },
  en: {
    metaTitle: "Blog",
    metaDescription:
      "Articles on the Mevratek platform: the architecture of centralised robot control, language models in robotics, and on-premise deployment inside a closed perimeter.",
    crumb: "Blog",
    eyebrow: "Blog",
    title: "Ideas and practice in autonomous device control",
    intro:
      "How the platform is built, why the decision engine stays vendor-neutral, and what a closed-perimeter deployment actually takes.",
    minutes: "min",
    read: "Read",
    docsBefore: "The technical reference for the protocol and the endpoints is in the ",
    docsLink: "platform documentation",
    docsAfter: ".",
    notFound: "Article not found",
    allPosts: "All articles",
    readTime: "min read",
    ctaTitle: "Want to connect your own device?",
    ctaBefore:
      "Tell us about the task and we will propose a pilot and help with the SDK integration. Or read the ",
    ctaLink: "platform documentation",
    ctaAfter: ".",
    ctaPrimary: "Discuss a pilot",
    ctaSecondary: "How the platform works",
  },
} as const;

export function BlogIndexView({ locale }: { locale: Locale }) {
  const c = BLOG_COPY[locale];
  const p = (path: string) => localePath(locale, path);

  return (
    <Section className="pt-14 sm:pt-20">
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/blog") },
        ]}
      />
      <Container>
        <SectionHeading eyebrow={c.eyebrow} title={c.title} intro={c.intro} />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {POSTS.map((post) => (
            <Card key={post.slug} className="flex flex-col">
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {post.tag[locale]} · {post.readMinutes} {c.minutes}
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-snug text-ink">
                <Link
                  href={p(`/blog/${post.slug}`)}
                  className="transition-colors hover:text-accent"
                >
                  {post.title[locale]}
                </Link>
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                {post.description[locale]}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <time dateTime={post.date} className="text-xs text-muted">
                  {formatDate(post.date, locale)}
                </time>
                <Link
                  href={p(`/blog/${post.slug}`)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink"
                >
                  {c.read} <ArrowIcon />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted">
          {c.docsBefore}
          <Link
            href={p("/documentation")}
            className="font-semibold text-accent hover:text-ink"
          >
            {c.docsLink}
          </Link>
          {c.docsAfter}
        </p>
      </Container>
    </Section>
  );
}

export function BlogPostView({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const c = BLOG_COPY[locale];
  const p = (path: string) => localePath(locale, path);
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <Section className="pt-14 sm:pt-20">
      <ArticleJsonLd
        title={post.title[locale]}
        description={post.description[locale]}
        slug={post.slug}
        datePublished={post.date}
        locale={locale}
      />
      <BreadcrumbJsonLd
        items={[
          { name: t(locale, "home"), url: p("/") },
          { name: c.crumb, url: p("/blog") },
          { name: post.title[locale], url: p(`/blog/${post.slug}`) },
        ]}
      />
      <Container>
        <article className="mx-auto max-w-3xl">
          <Link
            href={p("/blog")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink"
          >
            <ArrowIcon className="rotate-180" /> {c.allPosts}
          </Link>

          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {post.tag[locale]} · {post.readMinutes} {c.readTime} ·{" "}
            <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.12] sm:text-4xl">
            {post.title[locale]}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            {post.lead[locale]}
          </p>

          <div className="mt-10 space-y-10">
            {post.sections.map((s) => (
              <section key={s.h2.ru}>
                <h2 className="text-xl font-semibold text-ink sm:text-2xl">
                  {s.h2[locale]}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
                  {s.body.map((para, i) => (
                    <p key={i}>{para[locale]}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <div className="text-lg font-semibold text-ink">{c.ctaTitle}</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {c.ctaBefore}
              <Link
                href={p("/documentation")}
                className="font-semibold text-accent hover:text-ink"
              >
                {c.ctaLink}
              </Link>
              {c.ctaAfter}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href={p("/contacts")}>
                {c.ctaPrimary} <ArrowIcon />
              </Button>
              <Button href={p("/platform")} variant="secondary">
                {c.ctaSecondary}
              </Button>
            </div>
          </div>
        </article>
      </Container>
    </Section>
  );
}
