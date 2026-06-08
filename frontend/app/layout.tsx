import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cloud Brain — Robot Console",
  description: "Cloud decision-making console for connected robots",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand" style={{ color: "var(--text)" }}>
            ◎ Cloud<span>Brain</span>
          </Link>
          <Link href="/">Robots</Link>
          <Link href="/logs">Decision Logs</Link>
          <Link href="/tasks">Tasks</Link>
          <Link href="/simulator">Simulator</Link>
          <Link href="/api">API</Link>
          <Link href="/sdk">SDK</Link>
          <Link href="/docs">Documentation</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
