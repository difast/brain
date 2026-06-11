import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "PolisOS — Device Control",
  description: "Cloud platform for controlling any device through one protocol",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <LanguageProvider>
          <NavBar />
          {children}
          <footer className="footer">
            PolisOS · AI Decision Engine (YandexGPT · GigaChat · Claude · local
            models)
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
