import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 text-ink ${className}`}
      aria-label="Mevratek — на главную"
    >
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <rect width="32" height="32" rx="7" fill="#374151" />
        <circle cx="16" cy="16" r="8" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3" fill="#fff" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tightish">Mevratek</span>
    </Link>
  );
}
