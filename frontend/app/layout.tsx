import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { FeedbackProvider } from "@/components/feedback";

export const metadata: Metadata = {
  title: "Mevratek — управление устройствами",
  description:
    "Панель управления парком автономных устройств Mevratek: телеметрия, задачи, журнал решений и ключи доступа.",
  // The dashboard is behind a login, so it is never indexed or previewed.
  // Its icons come from app/favicon.ico, app/icon.png and app/apple-icon.png,
  // which Next.js links automatically.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#141a24",
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
