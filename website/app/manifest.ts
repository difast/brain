import type { MetadataRoute } from "next";

/**
 * The web app manifest, served at /manifest.webmanifest.
 *
 * This is what a phone reads when someone adds the site to their home screen:
 * which icon to draw, what to call it, and what colour to paint behind it while
 * it opens. Without it Android derives an icon from a screenshot and takes the
 * name from the page title, which is the long one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mevratek — платформа управления роботами",
    short_name: "Mevratek",
    description:
      "Российская платформа управления промышленными роботами и автономными устройствами. Разворачивается в контуре заказчика.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    // The plate's own colours, so the splash screen and the icon read as one
    // piece rather than a logo dropped onto white.
    background_color: "#141a24",
    theme_color: "#1e2532",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons to a shape of its own choosing — circle, squircle,
      // teardrop — and only the middle 80% is guaranteed to survive. The
      // maskable one is padded for that.
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
