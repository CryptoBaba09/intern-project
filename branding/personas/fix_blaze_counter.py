"""
Patches blaze-intro.mp4's in-scene "SUPPLY BURNED" display, which shipped
with a fabricated, decreasing ticker (~8,247,391 -> ~8,247,382) baked into
the original AI-generated render. Two problems with the original: the
number bears no relation to the real burned total, and it counts DOWN,
which is backwards -- burned supply only ever goes up.

Fix: black out the ticker region (static panel position, confirmed
unchanged across the clip) and overlay one real, static figure instead of
a fake live-looking countdown. Re-run this whenever the video is reused
and the number has drifted noticeably from the real one (check the
"$INTERN BURNED" figure on internburn.xyz).

Usage: python3 fix_blaze_counter.py <real_burned_total_str, e.g. "11,484,569">
Requires imageio_ffmpeg (pip install imageio-ffmpeg) -- no system ffmpeg needed.
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

HERE = Path(__file__).parent
VIDEO = HERE / "videos" / "blaze-intro.mp4"
FONT = "/System/Library/Fonts/Menlo.ttc"
# Ticker panel's number-rows region, in the video's 1280x720 frame --
# excludes the "SUPPLY BURNED" label above it, which is correct as-is.
BOX = (685, 108, 1020, 355)
BG = (14, 14, 12, 255)


def build_overlay(number_str: str) -> Path:
    img = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(BOX, radius=6, fill=BG)

    f_big = ImageFont.truetype(FONT, 54, index=1)
    f_small = ImageFont.truetype(FONT, 20, index=1)
    cx, cy = (BOX[0] + BOX[2]) // 2, (BOX[1] + BOX[3]) // 2

    bbox = d.textbbox((0, 0), number_str, font=f_big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = cx - tw // 2, cy - th // 2 - 30
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        d.text((tx + ox, ty + oy), number_str, font=f_big, fill=(255, 150, 40, 140))
    d.text((tx, ty), number_str, font=f_big, fill=(255, 180, 60, 255))

    cap = "$INTERN BURNED · VERIFY ON-CHAIN"
    bbox2 = d.textbbox((0, 0), cap, font=f_small)
    tw2, th2 = bbox2[2] - bbox2[0], bbox2[3] - bbox2[1]
    tx2, ty2 = cx - tw2 // 2, cy + th // 2 + 20
    d.text((tx2, ty2), cap, font=f_small, fill=(255, 150, 50, 230))

    out = HERE / "_blaze_overlay.png"
    img.save(out)
    return out


def main(number_str: str):
    overlay = build_overlay(number_str)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    tmp_out = VIDEO.with_name("blaze-intro-fixed.mp4")
    subprocess.run(
        [
            ffmpeg, "-y", "-i", str(VIDEO), "-i", str(overlay),
            "-filter_complex", "[0:v][1:v]overlay=0:0",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow",
            str(tmp_out),
        ],
        check=True,
    )
    tmp_out.replace(VIDEO)
    overlay.unlink()
    print("patched", VIDEO, "with", number_str)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1])
