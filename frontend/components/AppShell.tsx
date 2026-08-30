"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { ApiStatusBanner } from "@/components/feedback";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

// Top-level dashboard routes. A path that matches none of these is a 404 and
// is rendered bare (see AppShell) rather than gated behind auth.
const KNOWN_PREFIXES = [
  "/logs",
  "/tasks",
  "/simulator",
  "/connect",
  "/api",
  "/sdk",
  "/docs",
  "/robots",
];

function isKnownRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return KNOWN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Wraps every page. Login / admin / invite / 404 render bare; all other routes
 * require an authenticated session — unauthenticated visitors go to /login.
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

  // Unknown paths render the 404 page bare (no nav, no auth gate) so a broken
  // link shows the branded page to everyone instead of bouncing to /login.
  const notFound = !isBare && !isKnownRoute(pathname);

  useEffect(() => {
    if (status === "anon" && !isBare && !notFound) {
      router.replace("/login");
    }
  }, [status, isBare, notFound, router]);

  // Login / admin / invite / 404 pages manage their own layout (no nav/footer).
  if (isBare || notFound) return <>{children}</>;

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
