#!/usr/bin/env python3
"""Render the conference hand-out to website/public/mevratek-platform.pdf.

One A4 sheet, printed from `handout.html` by headless Chromium so it uses the
same palette, type and diagram as the site — a hand-out that looks like a
different company is worse than no hand-out.

One page rather than two on purpose: it prints on any machine without asking
about duplex, and it is read standing up at a stand. Anything that did not fit
is on the site, behind the QR code at the bottom of the sheet.

    python website/handout/build.py

Needs a headless Chromium (the one Playwright installed for the dashboard's
e2e suite will do) and, to embed Inter, network access to Google Fonts. Without the network it falls
back to the system sans stack and says so; the committed PDF already carries
its fonts subset-embedded, so this only matters when regenerating.

The QR codes are generated here rather than pasted in as images: `segno`
produces the module matrix, and the same path data is what the website renders
in `components/qr.tsx`, so paper and screen cannot drift apart.
"""

from __future__ import annotations

import base64
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "handout.html"
OUTPUT = HERE.parent / "public" / "mevratek-platform.pdf"

FONT_CSS_URL = (
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700"
    "&display=swap"
)
BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120"

# Only the Latin and Cyrillic subsets — the rest of Inter would triple the
# file for glyphs a Russian hand-out never renders.
WANTED_SUBSETS = ("U+0000-00FF", "U+0400")
WANTED_WEIGHTS = ("400", "500", "600", "700")


def inter_font_face() -> str:
    """Inter as base64 @font-face rules, or an empty string when offline."""
    try:
        request = urllib.request.Request(
            FONT_CSS_URL, headers={"User-Agent": BROWSER_UA}
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            css = response.read().decode()
    except Exception as exc:  # noqa: BLE001 - offline is a supported outcome
        print(f"  ! Google Fonts unreachable ({exc}); falling back to system sans")
        return ""

    rules: list[str] = []
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        weight = re.search(r"font-weight:\s*(\d+)", block)
        unicode_range = re.search(r"unicode-range:\s*([^;]+);", block)
        url = re.search(r"url\((https://[^)]+)\)", block)
        if not (weight and unicode_range and url):
            continue
        if weight.group(1) not in WANTED_WEIGHTS:
            continue
        if not any(s in unicode_range.group(1) for s in WANTED_SUBSETS):
            continue
        request = urllib.request.Request(
            url.group(1), headers={"User-Agent": BROWSER_UA}
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = base64.b64encode(response.read()).decode()
        rules.append(
            "@font-face{font-family:'Inter';font-style:normal;"
            f"font-weight:{weight.group(1)};"
            f"src:url(data:font/woff2;base64,{payload}) format('woff2');"
            f"unicode-range:{unicode_range.group(1).strip()};}}"
        )

    print(f"  · embedded Inter: {len(rules)} faces")
    return "<style>" + "\n".join(rules) + "</style>"


def qr_svg(url: str, *, quiet: int = 4) -> str:
    """An inline SVG QR code for `url`.

    Horizontal runs of dark modules are merged into one rect each, which keeps
    the path an order of magnitude shorter than one rect per module without
    changing a single pixel of the result.
    """
    import segno

    code = segno.make(url, error="m")
    matrix = [list(row) for row in code.matrix]
    size = len(matrix)

    parts: list[str] = []
    for y, row in enumerate(matrix):
        x = 0
        while x < size:
            if not row[x]:
                x += 1
                continue
            run = 1
            while x + run < size and row[x + run]:
                run += 1
            parts.append(f"M{x + quiet} {y + quiet}h{run}v1h-{run}z")
            x += run

    span = size + quiet * 2
    return (
        f'<svg viewBox="0 0 {span} {span}" xmlns="http://www.w3.org/2000/svg" '
        f'shape-rendering="crispEdges" role="img" '
        f'aria-label="QR-код: {url}">'
        f'<rect width="{span}" height="{span}" fill="#fff"/>'
        f'<path d="{"".join(parts)}" fill="#14171c"/>'
        "</svg>"
    )


def build_html() -> str:
    html = SOURCE.read_text(encoding="utf-8")
    html = html.replace("<!--FONT-FACE-->", inter_font_face())
    html = html.replace("<!--QR-SITE-->", qr_svg("https://mevratek.ru"))
    return html


CHROME_CANDIDATES = (
    "chromium",
    "chromium-browser",
    "google-chrome",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
)


def find_chrome() -> str:
    """Locate a Chromium to print with.

    CHROME overrides everything; otherwise the PATH is tried before the browser
    Playwright installed for the dashboard's e2e suite, which is the one
    present in CI and in this repo's container.
    """
    override = os.environ.get("CHROME")
    if override:
        return override
    for candidate in CHROME_CANDIDATES:
        found = shutil.which(candidate) if "/" not in candidate else candidate
        if found and Path(found).exists():
            return found
    raise SystemExit(
        "No Chromium found. Install one, or point CHROME at a binary:\n"
        "    CHROME=/path/to/chrome python website/handout/build.py"
    )


def render(html: str) -> None:
    """Print the page with headless Chromium.

    Driven through the browser's own --print-to-pdf rather than a Playwright
    dependency: the website has no Python toolchain of its own, and adding one
    to regenerate a PDF twice a year is not a trade worth making. @page in the
    stylesheet sets A4 with zero margin, and headless print honours it.
    """
    chrome = find_chrome()
    staged = HERE / ".rendered.html"
    staged.write_text(html, encoding="utf-8")
    profile = HERE / ".chrome-profile"
    try:
        subprocess.run(
            [
                chrome,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                f"--user-data-dir={profile}",
                "--no-pdf-header-footer",
                "--virtual-time-budget=5000",
                f"--print-to-pdf={OUTPUT}",
                staged.as_uri(),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"Chromium failed to print:\n{exc.stderr}") from exc
    finally:
        staged.unlink(missing_ok=True)
        shutil.rmtree(profile, ignore_errors=True)


def main() -> int:
    # `--qr <url>` prints an inline SVG and exits. That is how the path data in
    # components/qr.tsx was produced, so the code on the site and the code on
    # the sheet come out of the same generator.
    if len(sys.argv) > 2 and sys.argv[1] == "--qr":
        print(qr_svg(sys.argv[2]))
        return 0

    print(f"Building {OUTPUT.relative_to(HERE.parent.parent)}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    render(build_html())

    pages = ""
    try:
        listing = subprocess.run(
            ["pdfinfo", str(OUTPUT)], capture_output=True, text=True, check=False
        )
        for line in listing.stdout.splitlines():
            if line.startswith(("Pages:", "Page size:")):
                pages += f"  · {line.strip()}\n"
    except FileNotFoundError:
        pass

    print(f"  · {OUTPUT.stat().st_size / 1024:.0f} KB")
    print(pages, end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())
