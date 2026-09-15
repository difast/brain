import type { Metadata } from "next";

import { NotFoundView, NOT_FOUND_COPY } from "@/components/views/not-found";

export const metadata: Metadata = {
  title: NOT_FOUND_COPY.ru.metaTitle,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundView locale="ru" />;
}
