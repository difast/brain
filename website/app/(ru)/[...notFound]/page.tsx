import { notFound } from "next/navigation";

/**
 * Catches every URL that matches no real route, so the styled 404 renders
 * with a real 404 status instead of Next's built-in page.
 *
 * It exists because the site has two root layouts — one per locale route
 * group — and Next refuses a top-level `app/not-found.tsx` in that setup
 * ("not-found.tsx doesn't have a root layout"). A catch-all inside the
 * Russian group gives the miss a layout to live in; it is less specific than
 * every real route, English ones included, so it only runs when nothing else
 * matched.
 */
export default function CatchAll() {
  notFound();
}
