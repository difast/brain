import "../globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { RootShell } from "@/components/root-shell";
import { rootMetadata } from "@/content/meta";

export const metadata: Metadata = rootMetadata("ru");

/**
 * Paints the phone's browser chrome in the site's colour instead of the default
 * white, which is the difference between the page looking like an application
 * and looking like a document.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a24" },
  ],
};

export default function RussianRootLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="ru">{children}</RootShell>;
}
