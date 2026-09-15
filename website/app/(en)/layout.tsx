import "../globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { RootShell } from "@/components/root-shell";
import { rootMetadata } from "@/content/meta";

export const metadata: Metadata = rootMetadata("en");

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a24" },
  ],
};

/**
 * The English root layout.
 *
 * A second root layout — not a nested one — because `<html lang>` can only be
 * set by a root layout and the two languages need different values. Next
 * allows one root layout per route group, which is exactly what `(ru)` and
 * `(en)` are. The group name is stripped from the URL, so the English routes
 * live at `/en/...` because of the `en` directory inside the group, not
 * because of the group itself.
 */
export default function EnglishRootLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
