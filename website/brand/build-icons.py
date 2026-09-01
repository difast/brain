#!/usr/bin/env python3
"""Generate every icon and social preview from one master render.

    python website/brand/build-icons.py

`logo-source.webp` is the brand master, kept exactly as it was supplied: the mark on its rounded plate. Everything
a browser, a phone home screen, a messenger preview or a search engine shows is
derived from it here, so there is one source of truth and no set of icons that
quietly disagrees with another.

Outputs, all committed:

    website/app/favicon.ico          16 / 32 / 48, what a browser tab shows
    website/app/icon.png             512, the modern <link rel=icon>
    website/app/apple-icon.png       180, the iOS home screen
    website/public/icon-192.png      Android home screen
    website/public/icon-512.png      splash screen and install prompt
    website/public/icon-maskable.png 512, safe-zone padded for Android masks
    website/public/og.png            1200x630 social / messenger / Alice preview
    frontend/app/favicon.ico         the dashboard gets the same set
    frontend/app/icon.png
    frontend/app/apple-icon.png

The 1200x630 preview is composed in HTML and printed by headless Chromium, the
same way the conference hand-out is, so its type is Inter and its palette is the
site's rather than something approximated with a drawing library.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
WEBSITE = HERE.parent
REPO = WEBSITE.parent
FRONTEND = REPO / "frontend"
SOURCE = HERE / "logo-source.webp"

# The plate inside the master render, found by hand rather than by a threshold:
# the render has a gloss highlight along the top edge and a drop shadow below,
# and both defeat automatic edge detection. Square and centred on the plate.
PLATE = (152, 113, 1100, 1061)

# Tab favicons are drawn at these sizes; anything larger in an .ico is wasted
# bytes, and 48 is what Windows and some feed readers ask for.
ICO_SIZES = [(16, 16), (32, 32), (48, 48)]

# What every messenger, social network and Alice reads for a link preview.
OG_SIZE = (1200, 630)


def plate() -> Image.Image:
    """The master render cropped to the plate, in RGBA."""
    return Image.open(SOURCE).convert("RGBA").crop(PLATE)


def resized(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.LANCZOS)


def write_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)
    print(f"  · {path.relative_to(REPO)}  {image.width}x{image.height}"
          f"  {path.stat().st_size / 1024:.0f} KB")


def maskable(image: Image.Image, size: int = 512) -> Image.Image:
    """An Android maskable icon.

    Android crops these to a shape of its own choosing — circle, squircle,
    teardrop — and only the middle 80% is guaranteed to survive. The plate goes
    in full bleed rather than padded onto a background: the ring is 60% of the
    width, so it clears the safe circle with room to spare, and what the mask
    takes off is the plate's dark corners, which is exactly what should go.

    Padding it instead leaves a visible seam — the plate is darker at its
    corners than in the body, so no single fill colour matches both.
    """
    return resized(image, size)


def find_chrome() -> str:
    override = os.environ.get("CHROME")
    if override:
        return override
    for candidate in (
        "chromium",
        "chromium-browser",
        "google-chrome",
        "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    ):
        found = shutil.which(candidate) if "/" not in candidate else candidate
        if found and Path(found).exists():
            return found
    raise SystemExit("No Chromium found; set CHROME=/path/to/chrome")


def build_og(mark: Image.Image) -> None:
    """Compose the 1200x630 preview and print it with headless Chromium."""
    sys.path.insert(0, str(WEBSITE / "handout"))
    from build import inter_font_face  # noqa: PLC0415 - shared with the hand-out

    logo = HERE / ".og-logo.png"
    write_png(resized(mark, 320), logo)

    html = (HERE / "og.html").read_text(encoding="utf-8")
    html = html.replace("<!--FONT-FACE-->", inter_font_face())
    html = html.replace("<!--LOGO-->", logo.name)

    # Printed to PDF at an exact page size and then rasterised, rather than
    # screenshotted: headless Chromium's --screenshot applies a device scale
    # factor of its own and clips, which silently produced a card with the
    # bottom row of tags cut off.
    staged = HERE / ".og.html"
    staged.write_text(html, encoding="utf-8")
    sheet = HERE / ".og.pdf"
    profile = HERE / ".chrome-profile"
    try:
        subprocess.run(
            [
                find_chrome(),
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                f"--user-data-dir={profile}",
                "--no-pdf-header-footer",
                "--virtual-time-budget=5000",
                f"--print-to-pdf={sheet}",
                staged.as_uri(),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"Chromium failed to render og.png:\n{exc.stderr}") from exc

    import pypdfium2

    page = pypdfium2.PdfDocument(sheet)[0]
    # The @page box is declared in the same 1200x630 CSS pixels the card is laid
    # out in, so one PDF point is one pixel and the scale is exactly 1.
    preview = page.render(scale=OG_SIZE[0] / page.get_width()).to_pil().convert("RGB")
    if preview.size != OG_SIZE:
        preview = preview.resize(OG_SIZE, Image.LANCZOS)
    write_png(preview, WEBSITE / "public" / "og.png")

    for scratch in (staged, sheet, logo):
        scratch.unlink(missing_ok=True)
    shutil.rmtree(profile, ignore_errors=True)


def main() -> int:
    if not SOURCE.exists():
        raise SystemExit(f"missing brand master: {SOURCE}")

    mark = plate()
    print(f"Master {SOURCE.name}: plate cropped to {mark.width}x{mark.height}")

    # A multi-size .ico. Pillow resamples from the largest frame on its own,
    # which is noticeably softer at 16px than resizing each size from the full
    # -resolution master, so each frame is prepared here instead.
    ico = WEBSITE / "app" / "favicon.ico"
    frames = [resized(mark, size).convert("RGB") for size, _ in ICO_SIZES]
    frames[-1].save(ico, format="ICO", sizes=ICO_SIZES, append_images=frames[:-1])
    print(f"  · {ico.relative_to(REPO)}  {[s for s, _ in ICO_SIZES]}"
          f"  {ico.stat().st_size / 1024:.0f} KB")

    write_png(resized(mark, 512), WEBSITE / "app" / "icon.png")
    write_png(resized(mark, 180), WEBSITE / "app" / "apple-icon.png")
    write_png(resized(mark, 192), WEBSITE / "public" / "icon-192.png")
    write_png(resized(mark, 512), WEBSITE / "public" / "icon-512.png")
    write_png(maskable(mark), WEBSITE / "public" / "icon-maskable.png")

    # The dashboard is the same product; it gets the same mark.
    shutil.copy(ico, FRONTEND / "app" / "favicon.ico")
    print(f"  · {(FRONTEND / 'app' / 'favicon.ico').relative_to(REPO)}")
    write_png(resized(mark, 512), FRONTEND / "app" / "icon.png")
    write_png(resized(mark, 180), FRONTEND / "app" / "apple-icon.png")

    build_og(mark)
    return 0


if __name__ == "__main__":
    sys.exit(main())
