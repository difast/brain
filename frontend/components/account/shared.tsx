"use client";

/** Pieces shared by the account panels. */

/**
 * A readable device name out of a User-Agent string.
 *
 * The point is that a person can recognise their own session in the list and
 * spot one they do not recognise — so an unparseable agent gets a plain label
 * rather than a wall of version numbers.
 */
export function deviceLabel(ua: string | null): string {
  if (!ua) return "—";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /YaBrowser|Yandex/.test(ua)
        ? "Яндекс.Браузер"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;

  if (browser || os) return [browser, os].filter(Boolean).join(" · ");

  // Not a browser: an SDK, a script or a command-line tool. Naming the tool is
  // more useful than showing its version string.
  if (/curl/i.test(ua)) return "curl";
  if (/python|httpx|requests|aiohttp/i.test(ua)) return "Python";
  if (/go-http-client|mevratek-go/i.test(ua)) return "Go";
  if (/node|axios|undici/i.test(ua)) return "Node.js";
  if (/mevratek-c\//i.test(ua)) return "C / C++ SDK";
  if (/postman|insomnia/i.test(ua)) return "API-клиент";

  return ua.length > 36 ? `${ua.slice(0, 36)}…` : ua;
}

/** Round avatar, falling back to the first letter of the address. */
export function Avatar({
  email,
  src,
  size = 64,
}: {
  email: string;
  src: string | null;
  size?: number;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{
          borderRadius: "50%",
          objectFit: "cover",
          width: size,
          height: size,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent-strong)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
      aria-hidden
    >
      {email.charAt(0).toUpperCase()}
    </div>
  );
}

/** One panel on the account page — a heading, an optional hint, then content. */
export function Panel({
  title,
  hint,
  danger = false,
  children,
}: {
  title: string;
  hint?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="panel"
      style={{
        marginBottom: 16,
        ...(danger ? { borderColor: "var(--error)" } : {}),
      }}
    >
      <h2 style={danger ? { color: "var(--error)" } : undefined}>{title}</h2>
      {hint && (
        <p className="muted" style={{ marginTop: -6 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
