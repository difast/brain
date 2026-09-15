import type { MetadataRoute } from "next";

import { POST_SLUGS } from "@/components/blog";
import { localePath } from "@/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

const abs = (path: string) => `${siteUrl}${path === "/" ? "" : path}`;

/**
 * One entry per Russian URL, with the English URL declared as its alternate.
 *
 * Listing each language as a separate top-level entry would be the other valid
 * shape, but Google wants every URL in a language group to point at every
 * other one; doing it through `alternates` keeps that reciprocal and means a
 * page added below cannot be half-registered.
 */
function entry(
  path: string,
  priority: number,
  changeFrequency: "weekly" | "monthly" = "monthly",
): MetadataRoute.Sitemap[number] {
  return {
    url: abs(localePath("ru", path)),
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: {
        ru: abs(localePath("ru", path)),
        en: abs(localePath("en", path)),
        "x-default": abs(localePath("ru", path)),
      },
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/platform", priority: 0.8 },
    { path: "/protocol", priority: 0.8 },
    { path: "/on-premise", priority: 0.7 },
    { path: "/documentation", priority: 0.8 },
    { path: "/mcp", priority: 0.7 },
    { path: "/blog", priority: 0.7 },
    { path: "/for-who", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/materials", priority: 0.6 },
    { path: "/contacts", priority: 0.6 },
    { path: "/privacy", priority: 0.3 },
    { path: "/privacy-policy", priority: 0.3 },
    { path: "/consent", priority: 0.3 },
  ];

  return [
    ...staticRoutes.map((r) =>
      entry(r.path, r.priority, r.path === "/blog" ? "weekly" : "monthly"),
    ),
    ...POST_SLUGS.map((slug) => entry(`/blog/${slug}`, 0.6)),
  ];
}
