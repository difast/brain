import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mevratek.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/platform", "/for-who", "/about", "/contacts"];
  const now = new Date();
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
