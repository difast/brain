import type { Metadata } from "next";

import { NotFoundView, NOT_FOUND_COPY } from "@/components/views/not-found";

export const metadata: Metadata = {
  title: NOT_FOUND_COPY.en.metaTitle,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView locale="en" />;
}
