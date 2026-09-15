import type { Metadata } from "next";

import { ContactsView, CONTACTS_COPY } from "@/components/views/contacts";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = pageMetadata("en", "/contacts", {
  title: CONTACTS_COPY.en.metaTitle,
  description: CONTACTS_COPY.en.metaDescription,
  ogTitle: CONTACTS_COPY.en.ogTitle,
});

export default function ContactsPage() {
  return <ContactsView locale="en" />;
}
