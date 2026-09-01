import type { MetadataRoute } from "next";
import { POST_SLUGS } from "@/components/blog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core pages with their relative priority.
  const staticRoutes: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/platform", priority: 0.8 },
    { path: "/protocol", priority: 0.8 },
    { path: "/on-premise", priority: 0.7 },
    { path: "/documentation", priority: 0.8 },
    { path: "/blog", priority: 0.7 },
    { path: "/for-who", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/materials", priority: 0.6 },
    { path: "/contacts", priority: 0.6 },
    { path: "/privacy", priority: 0.3 },
    { path: "/consent", priority: 0.3 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${siteUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.path === "/blog" ? "weekly" : "monthly",
    priority: r.priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = POST_SLUGS.map((slug) => ({
    url: `${siteUrl}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries];
}
