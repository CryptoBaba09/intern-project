import subprocess, sys, os
from PIL import Image

TEMPLATE = """<meta charset="utf-8">
<style>
  html,body{{margin:0;padding:0;}}
  .stage{{
    width:1080px;height:1080px;background:#0B0C0B;
    position:relative;overflow:hidden;font-family:Arial,sans-serif;
    background-image: radial-gradient(ellipse 700px 600px at 50% 40%, {glow}, transparent 70%);
  }}
  .eyebrow{{
    position:absolute;top:130px;left:0;width:1080px;text-align:center;
    font-family:ui-monospace,monospace;font-size:24px;color:{accent};letter-spacing:0.16em;
  }}
  .title{{
    position:absolute;top:172px;left:0;width:1080px;text-align:center;
    font-size:56px;font-weight:800;color:#EDEEF0;
  }}
  .steps{{
    position:absolute;top:330px;left:90px;width:900px;
    display:flex;justify-content:space-between;
  }}
  .step{{width:260px;text-align:center;}}
  .step .pill{{
    display:inline-block;font-family:ui-monospace,monospace;font-size:20px;font-weight:700;
    border-radius:999px;padding:10px 22px;margin-bottom:0;
    border:2px solid #1B1D1B;color:#4A4F54;
  }}
  .step.active .pill{{border-color:{accent};color:{accent};background:{accentbg};}}
  .arrow{{width:60px;text-align:center;font-size:30px;color:#1B1D1B;padding-top:8px;}}
  .arrow.active{{color:{accent};}}
  .desc{{
    position:absolute;top:520px;left:140px;width:800px;text-align:center;
    font-size:40px;font-weight:700;color:#EDEEF0;line-height:1.35;
  }}
  .sub{{
    position:absolute;top:680px;left:190px;width:700px;text-align:center;
    font-size:24px;color:#9BA1A6;line-height:1.5;
  }}
  .footer{{
    position:absolute;top:960px;left:0;width:1080px;text-align:center;
    font-family:ui-monospace,monospace;font-size:20px;color:#4A4F54;
  }}
</style>
<div class="stage">
  <div class="eyebrow">$INTERN UTILITY &middot; {name_upper}</div>
  <div class="title">{name}</div>
  <div class="steps">
    <div class="step {a1}"><div class="pill">01 {step1}</div></div>
    <div class="arrow {arrow1}">&rarr;</div>
    <div class="step {a2}"><div class="pill">02 {step2}</div></div>
    <div class="arrow {arrow2}">&rarr;</div>
    <div class="step {a3}"><div class="pill">03 {step3}</div></div>
  </div>
  <div class="desc">{headline}</div>
  <div class="sub">{desc}</div>
  <div class="footer">internburn.xyz{path}</div>
</div>
"""

def render_frame(html, outdir, name):
    htmlpath = os.path.join(outdir, f"{name}.html")
    with open(htmlpath, "w") as f:
        f.write(html)
    subprocess.run(["qlmanage", "-t", "-s", "1600", "-o", outdir, htmlpath],
                    check=True, capture_output=True)
    png = os.path.join(outdir, f"{name}.html.png")
    img = Image.open(png).convert("RGB")
    img = img.resize((1080, 1080), Image.LANCZOS)
    return img

def build_gif(slug, name, step1, step2, step3, headline, desc, path,
              accent="#00C805", accentbg="rgba(0,200,5,0.1)", glow="rgba(0,200,5,0.16)",
              outdir="/private/tmp/claude-501/-Users-arpitberi-Desktop-intern-project/795fa4a3-9a15-4fff-a8ab-97f3836dc9df/scratchpad/gif-fix",
              outfile=None):
    frames = []
    states = [
        dict(a1="active", a2="", a3="", arrow1="", arrow2=""),
        dict(a1="", a2="active", a3="", arrow1="active", arrow2=""),
        dict(a1="", a2="", a3="active", arrow1="active", arrow2="active"),
    ]
    for i, st in enumerate(states):
        html = TEMPLATE.format(
            glow=glow, accent=accent, accentbg=accentbg,
            name_upper=name.upper(), name=name,
            step1=step1, step2=step2, step3=step3,
            headline=headline, desc=desc, path=path,
            **st,
        )
        frames.append(render_frame(html, outdir, f"{slug}-frame{i}"))
    durations = [900, 900, 2200]
    outfile = outfile or os.path.join(outdir, f"x-gif-{slug}-fixed.gif")
    frames[0].save(outfile, save_all=True, append_images=frames[1:],
                    duration=durations, loop=0, optimize=True)
    print("saved", outfile)

if __name__ == "__main__":
    build_gif(
        "blaze", "Blaze", "CLAIM", "BURN", "REPEAT",
        "Fees accrue on every trade",
        "2% swap fee on Pons, paired against ETH.",
        "/tokenomics",
    )
    build_gif(
        "trade", "Trade", "CONNECT", "QUOTE", "SWAP",
        "Connect your wallet",
        "Pons bonding curve today — a real pool once it graduates.",
        "/trade",
    )
    build_gif(
        "synapse", "Synapse", "READ CHAIN", "MAP NODES", "SEE IT LIVE",
        "Burn and stake, mapped as a network",
        "v1 live now, real numbers, no fee.",
        "/synapse",
    )
