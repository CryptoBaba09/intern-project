"""
Builds x-gif-forge-teaser.gif: Forge's existing lab concept art
(personas/forge.png) with a bottom banner overlay teasing the 5th
intern, blinking dot as the only animated element -- same "real static
claim + honest blinking-live cue" pattern gen_burn_ticker_gif.py already
uses, not a fake countdown or spinning-wheel animation implying more
motion than there actually is behind this.

This is a teaser for a NOT-YET-BUILT feature (confidential-swap
facilitation) -- the banner text is deliberately vague on mechanism
("in the lab") rather than promising a specific technical claim
("private RPC", "MEV protection", etc.) that hasn't been verified
buildable yet. Update the copy once the real mechanism is confirmed.

Usage: python3 gen_forge_cooking_gif.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
SRC = HERE.parent / "intern-site" / "public" / "personas" / "forge.png"
OUT = HERE / "x-gif-forge-teaser.gif"
FONT = "/System/Library/Fonts/Menlo.ttc"

BANNER_H = 92
DOT_COLORS = ["#00C805", "#1B1D1B", "#00C805"]


def build_frame(base: Image.Image, dot_color: str) -> Image.Image:
    frame = base.copy()
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    w, h = frame.size
    d.rectangle([0, h - BANNER_H, w, h], fill=(11, 12, 11, 235))

    f_label = ImageFont.truetype(FONT, 22, index=1)
    f_sub = ImageFont.truetype(FONT, 15, index=1)

    dot_r = 7
    dot_cx, dot_cy = 44, h - BANNER_H // 2
    d.ellipse(
        [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
        fill=dot_color,
    )

    label = "5TH INTERN · IN THE LAB"
    d.text((64, h - BANNER_H // 2 - 24), label, font=f_label, fill=(237, 238, 240, 255))
    sub = "Confidential swaps — details soon"
    d.text((64, h - BANNER_H // 2 + 4), sub, font=f_sub, fill=(155, 161, 166, 255))

    composed = Image.alpha_composite(frame.convert("RGBA"), overlay)
    return composed.convert("RGB")


def main():
    base = Image.open(SRC).convert("RGB")
    frames = [build_frame(base, c) for c in DOT_COLORS]
    frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=[900, 900, 900], loop=0, optimize=True)
    print("saved", OUT)


if __name__ == "__main__":
    main()
