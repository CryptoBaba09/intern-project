"""
Rebuilds x-gif-burn-ticker.gif from gif-burn-ticker-frame.html.

The original version of this gif faked a "live ticking" counter by
animating through several different numbers (e.g. 19,540,000 rising to
19,608,690) across its frames. That's inherently dishonest for a static,
looping GIF: it freezes at whatever range it shipped with and drifts
further from the real number every day it's reused, exactly the kind of
"burns are a marketing screenshot" behavior this project's whole pitch
argues against.

Fix: one real, static number across all frames, with a blinking "LIVE"
dot as the only animated element -- signals "live" without implying a
number that's actually moving inside a GIF that isn't.

Usage: python3 gen_burn_ticker_gif.py <real_burned_total, e.g. "11,484,569">
Re-run whenever the number drifts noticeably from the real one (check
the "$INTERN BURNED" figure on internburn.xyz).
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
TEMPLATE_PATH = HERE / "gif-burn-ticker-frame.html"
OUT = HERE / "x-gif-burn-ticker.gif"


def render(html: str, name: str, outdir: Path) -> Image.Image:
    htmlpath = outdir / f"{name}.html"
    htmlpath.write_text(html)
    subprocess.run(
        ["qlmanage", "-t", "-s", "1600", "-o", str(outdir), str(htmlpath)],
        check=True, capture_output=True,
    )
    png = outdir / f"{name}.html.png"
    return Image.open(png).convert("RGB").resize((1080, 1080), Image.LANCZOS)


def main(num_str: str):
    template = TEMPLATE_PATH.read_text()
    outdir = HERE / "_burn_ticker_tmp"
    outdir.mkdir(exist_ok=True)

    dot_colors = ["#00C805", "#1B1D1B", "#00C805"]
    frames = []
    for i, dot in enumerate(dot_colors):
        html = template.replace("{{NUM}}", num_str).replace(
            '<span class="dot"></span>', f'<span class="dot" style="background:{dot}"></span>'
        )
        frames.append(render(html, f"f{i}", outdir))

    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=[900, 900, 900], loop=0, optimize=True)
    for f in outdir.glob("*"):
        f.unlink()
    outdir.rmdir()
    print("saved", OUT, "with", num_str)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
