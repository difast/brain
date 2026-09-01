import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, Card, Container, Section, SectionHeading } from "@/components/ui";
import { POSTS, formatDate } from "@/components/blog";
import { BreadcrumbJsonLd } from "@/components/schema";

export const metadata: Metadata = {
  title: "Блог",
  description:
    "Статьи о платформе Mevratek: архитектура централизованного управления роботами, российские LLM в робототехнике и on-premise развёртывание в закрытом контуре.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <Section className="pt-14 sm:pt-20">
      <BreadcrumbJsonLd
        items={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/blog" },
        ]}
      />
      <Container>
        <SectionHeading
          eyebrow="Блог"
          title="Идеи и практика управления автономными устройствами"
          intro="Как устроена платформа, почему движок решений нейтрален к вендору и что нужно для развёртывания в закрытом контуре."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {POSTS.map((post) => (
            <Card key={post.slug} className="flex flex-col">
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                {post.tag} · {post.readMinutes} мин
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-snug text-ink">
                <Link
                  href={`/blog/${post.slug}`}
                  className="transition-colors hover:text-accent"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                {post.description}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <time
                  dateTime={post.date}
                  className="text-xs text-muted"
                >
                  {formatDate(post.date)}
                </time>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-ink"
                >
                  Читать <ArrowIcon />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted">
          Техническая справка по протоколу и эндпоинтам собрана в{" "}
          <Link
            href="/documentation"
            className="font-semibold text-accent hover:text-ink"
          >
            документации платформы
          </Link>
          .
        </p>
      </Container>
    </Section>
  );
}
