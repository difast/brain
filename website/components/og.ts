/**
 * The link preview every messenger, social network and Alice renders.
 *
 * Lives here rather than in a layout because Next replaces `openGraph`
 * wholesale when a page defines its own — it does not merge the image in —
 * so every page that sets openGraph has to name this explicitly, and pages
 * importing it from a layout break the moment that layout moves.
 */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Mevratek — мозг для парка устройств внутри вашего контура",
};
