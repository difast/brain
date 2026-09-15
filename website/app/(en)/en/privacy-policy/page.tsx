import type { Metadata } from "next";

import {
  PrivacyPolicyView,
  PRIVACY_POLICY_COPY,
} from "@/components/views/privacy-policy";
import { pageMetadata } from "@/content/meta";

export const metadata: Metadata = {
  ...pageMetadata("en", "/privacy-policy", {
    title: PRIVACY_POLICY_COPY.en.metaTitle,
    description: PRIVACY_POLICY_COPY.en.metaDescription,
  }),
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyView locale="en" />;
}
