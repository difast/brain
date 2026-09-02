"use client";

import type { ReactNode } from "react";
import { buttonClass } from "./ui";

/**
 * Opens the file in a new tab *and* saves a copy to the device.
 *
 * These are two different browser behaviours and one anchor cannot do both:
 * put `download` on a link and the browser saves the file instead of
 * navigating, so `target="_blank"` is ignored and no tab appears. So the click
 * does both explicitly — the popup first, because that is the fragile half:
 * browsers only allow `window.open` while a user gesture is being handled, and
 * spending the gesture on the download first is a good way to have the tab
 * silently blocked.
 *
 * The element stays a real anchor with a real href. Without JavaScript, with a
 * middle click, or with "open in new tab" from the context menu it behaves the
 * way any link would; the handler only adds the save.
 */
export function DownloadPdfButton({
  href,
  filename,
  children,
  className = "",
}: {
  href: string;
  /** The name the file is saved under, not the one it is served under. */
  filename: string;
  children: ReactNode;
  className?: string;
}) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Leave the modified clicks alone — the visitor has already said what they
    // want, and hijacking ctrl-click is the kind of thing that makes a site
    // feel broken.
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();

    window.open(href, "_blank", "noopener,noreferrer");

    // A second request for the same file, but a static PDF with cache headers
    // comes back from the browser's cache rather than the network.
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={buttonClass("primary", className)}
    >
      {children}
    </a>
  );
}
