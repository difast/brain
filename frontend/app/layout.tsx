import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FeedbackProvider } from "@/components/feedback";

export const metadata: Metadata = {
  title: "Mevratek — Device Control",
  description: "Cloud platform for controlling any device through one protocol",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <LanguageProvider>
          <AuthProvider>
            <FeedbackProvider>
              <AppShell>{children}</AppShell>
            </FeedbackProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
