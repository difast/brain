import type { Metadata } from "next";

import { ContactsView, CONTACTS_COPY } from "@/components/views/contacts";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("ru", "/contacts", {
  title: CONTACTS_COPY.ru.metaTitle,
  description: CONTACTS_COPY.ru.metaDescription,
  ogTitle: CONTACTS_COPY.ru.ogTitle,
});

export default function ContactsPage() {
  return <ContactsView locale="ru" />;
}
