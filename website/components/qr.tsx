/**
 * The QR code that leads to the printed hand-out.
 *
 * The module pattern is baked in as path data rather than generated at
 * runtime: a QR code for a URL that never changes is a constant, and shipping
 * a generator to the browser to recompute a constant on every render is not a
 * trade worth making. Horizontal runs of dark modules are merged into one
 * rect each, which is why the path is a few hundred commands and not 400.
 *
 * Regenerate with:
 *   python website/handout/build.py --qr https://mevratek.ru/pdf
 *
 * Same generator as the sheet itself, so screen and paper cannot drift.
 */

/** Includes the 4-module quiet zone the spec requires — do not crop it. */
const SPAN = 33;

const MODULES =
  "M4 4h7v1h-7zM12 4h1v1h-1zM14 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1z" +
  "M22 4h7v1h-7zM4 5h1v1h-1zM10 5h1v1h-1zM12 5h1v1h-1zM14 5h5v1h-5z" +
  "M22 5h1v1h-1zM28 5h1v1h-1zM4 6h1v1h-1zM6 6h3v1h-3zM10 6h1v1h-1zM13 6h5v1h-5z" +
  "M19 6h1v1h-1zM22 6h1v1h-1zM24 6h3v1h-3zM28 6h1v1h-1zM4 7h1v1h-1zM6 7h3v1h-3z" +
  "M10 7h1v1h-1zM12 7h2v1h-2zM15 7h1v1h-1zM17 7h2v1h-2zM22 7h1v1h-1z" +
  "M24 7h3v1h-3zM28 7h1v1h-1zM4 8h1v1h-1zM6 8h3v1h-3zM10 8h1v1h-1zM13 8h1v1h-1z" +
  "M15 8h2v1h-2zM19 8h1v1h-1zM22 8h1v1h-1zM24 8h3v1h-3zM28 8h1v1h-1z" +
  "M4 9h1v1h-1zM10 9h1v1h-1zM14 9h2v1h-2zM17 9h2v1h-2zM22 9h1v1h-1z" +
  "M28 9h1v1h-1zM4 10h7v1h-7zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1z" +
  "M18 10h1v1h-1zM20 10h1v1h-1zM22 10h7v1h-7zM12 11h1v1h-1zM19 11h1v1h-1z" +
  "M4 12h1v1h-1zM6 12h2v1h-2zM9 12h3v1h-3zM14 12h3v1h-3zM19 12h2v1h-2z" +
  "M22 12h1v1h-1zM25 12h1v1h-1zM27 12h2v1h-2zM4 13h4v1h-4zM9 13h1v1h-1z" +
  "M11 13h1v1h-1zM13 13h1v1h-1zM15 13h3v1h-3zM20 13h1v1h-1zM23 13h1v1h-1z" +
  "M27 13h1v1h-1zM6 14h1v1h-1zM9 14h2v1h-2zM16 14h2v1h-2zM20 14h1v1h-1z" +
  "M23 14h2v1h-2zM4 15h2v1h-2zM7 15h1v1h-1zM9 15h1v1h-1zM11 15h3v1h-3z" +
  "M17 15h2v1h-2zM21 15h1v1h-1zM24 15h3v1h-3zM5 16h2v1h-2zM8 16h1v1h-1z" +
  "M10 16h1v1h-1zM12 16h1v1h-1zM14 16h1v1h-1zM17 16h3v1h-3zM21 16h2v1h-2z" +
  "M24 16h1v1h-1zM26 16h3v1h-3zM6 17h1v1h-1zM8 17h2v1h-2zM13 17h1v1h-1z" +
  "M15 17h1v1h-1zM19 17h2v1h-2zM22 17h3v1h-3zM28 17h1v1h-1zM5 18h1v1h-1z" +
  "M8 18h1v1h-1zM10 18h1v1h-1zM12 18h3v1h-3zM16 18h2v1h-2zM20 18h2v1h-2z" +
  "M24 18h1v1h-1zM26 18h2v1h-2zM4 19h1v1h-1zM6 19h3v1h-3zM11 19h1v1h-1z" +
  "M13 19h1v1h-1zM16 19h1v1h-1zM19 19h2v1h-2zM23 19h2v1h-2zM28 19h1v1h-1z" +
  "M6 20h3v1h-3zM10 20h4v1h-4zM15 20h1v1h-1zM17 20h1v1h-1zM20 20h9v1h-9z" +
  "M12 21h2v1h-2zM16 21h2v1h-2zM19 21h2v1h-2zM24 21h1v1h-1zM26 21h1v1h-1z" +
  "M28 21h1v1h-1zM4 22h7v1h-7zM12 22h5v1h-5zM18 22h1v1h-1zM20 22h1v1h-1z" +
  "M22 22h1v1h-1zM24 22h1v1h-1zM26 22h3v1h-3zM4 23h1v1h-1zM10 23h1v1h-1z" +
  "M12 23h1v1h-1zM16 23h1v1h-1zM18 23h3v1h-3zM24 23h1v1h-1zM28 23h1v1h-1z" +
  "M4 24h1v1h-1zM6 24h3v1h-3zM10 24h1v1h-1zM13 24h1v1h-1zM15 24h1v1h-1z" +
  "M18 24h1v1h-1zM20 24h6v1h-6zM27 24h1v1h-1zM4 25h1v1h-1zM6 25h3v1h-3z" +
  "M10 25h1v1h-1zM12 25h2v1h-2zM16 25h1v1h-1zM21 25h2v1h-2zM24 25h5v1h-5z" +
  "M4 26h1v1h-1zM6 26h3v1h-3zM10 26h1v1h-1zM12 26h1v1h-1zM15 26h1v1h-1z" +
  "M17 26h1v1h-1zM22 26h1v1h-1zM24 26h1v1h-1zM26 26h2v1h-2zM4 27h1v1h-1z" +
  "M10 27h1v1h-1zM13 27h2v1h-2zM17 27h1v1h-1zM24 27h1v1h-1zM26 27h1v1h-1z" +
  "M4 28h7v1h-7zM12 28h2v1h-2zM16 28h1v1h-1zM23 28h6v1h-6z";

export const HANDOUT_URL = "https://mevratek.ru/pdf";

export function HandoutQr({
  className = "",
  title = "QR-код на PDF о платформе Mevratek",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${SPAN} ${SPAN}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
    >
      <rect width={SPAN} height={SPAN} fill="#ffffff" />
      <path d={MODULES} fill="#14171c" />
    </svg>
  );
}
