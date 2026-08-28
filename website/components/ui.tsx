import Link from "next/link";
import type { ReactNode } from "react";

type El = { className?: string; children: ReactNode };

export function Container({ className = "", children }: El) {
  return <div className={`container-x ${className}`}>{children}</div>;
}

export function Section({
  className = "",
  children,
  id,
}: El & { id?: string }) {
  return (
    <section id={id} className={`py-16 sm:py-20 lg:py-24 ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
      <span className="h-px w-6 bg-accent/50" />
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? (
        <div className={align === "center" ? "flex justify-center" : ""}>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      <h2 className="text-3xl font-semibold leading-[1.1] sm:text-4xl">{title}</h2>
      {intro ? (
        <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>
      ) : null}
    </div>
  );
}

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const styles = {
    primary:
      "bg-accent-strong text-white hover:bg-ink shadow-sm hover:shadow",
    secondary:
      "bg-white text-ink ring-1 ring-line hover:ring-accent/40 hover:bg-surface",
    ghost: "text-ink hover:text-accent",
  }[variant];
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external) {
    return (
      <a href={href} className={`${base} ${styles} ${className}`}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ className = "", children }: El) {
  return (
    <div
      className={`rounded-xl border border-line bg-white p-6 transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(20,23,28,0.04),0_8px_24px_-12px_rgba(20,23,28,0.12)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  value,
  label,
}: {
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="border-t border-line pt-5">
      <div className="text-4xl font-semibold tracking-tightish text-ink sm:text-5xl">
        {value}
      </div>
      <div className="mt-2 text-sm leading-snug text-muted">{label}</div>
    </div>
  );
}

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`h-4 w-4 ${className}`}
    >
      <path
        d="M3 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
