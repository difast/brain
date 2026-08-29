"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { ApiStatusBanner } from "@/components/feedback";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

/**
 * Wraps every page. The login page renders bare; all other routes require an
 * authenticated session — unauthenticated visitors are redirected to /login.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();

  // Pages that render outside the authenticated dashboard shell.
  const isBare =
    pathname === "/login" ||
    pathname === "/admin" ||
    pathname.startsWith("/invite/");

  useEffect(() => {
    if (status === "anon" && !isBare) {
      router.replace("/login");
    }
  }, [status, isBare, router]);

  // Login / admin / invite pages manage their own layout (no nav/footer).
  if (isBare) return <>{children}</>;

  if (status === "loading") {
    return (
      <main className="container">
        <div className="auth-loading">{t("auth.checking")}</div>
      </main>
    );
  }

  if (status === "anon") {
    // Redirect is in flight; render nothing to avoid a flash of the dashboard.
    return null;
  }

  return (
    <>
      <ApiStatusBanner />
      <NavBar />
      {children}
      <footer className="footer">
        Mevratek · AI Decision Engine (YandexGPT · GigaChat · Claude · local
        models)
      </footer>
    </>
  );
}
