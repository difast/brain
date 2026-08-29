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

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (status === "anon" && !isLogin) {
      router.replace("/login");
    }
  }, [status, isLogin, router]);

  // The login page manages its own layout (no nav/footer).
  if (isLogin) return <>{children}</>;

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
