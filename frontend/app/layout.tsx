import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { NavBar } from "@/components/NavBar";
import { ApiStatusBanner, FeedbackProvider } from "@/components/feedback";

export const metadata: Metadata = {
  title: "Mevratek — Device Control",
  description: "Cloud platform for controlling any device through one protocol",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <LanguageProvider>
          <FeedbackProvider>
            <ApiStatusBanner />
            <NavBar />
            {children}
            <footer className="footer">
              Mevratek · AI Decision Engine (YandexGPT · GigaChat · Claude ·
              local models)
            </footer>
          </FeedbackProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
