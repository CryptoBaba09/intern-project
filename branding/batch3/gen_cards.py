TEMPLATE = """<meta charset="utf-8">
<style>
  html,body{{margin:0;padding:0;}}
  .stage{{
    width:1200px;height:675px;background:#0B0C0B;
    position:relative;overflow:hidden;font-family:Arial,sans-serif;
    background-image: radial-gradient(ellipse 650px 500px at {glow_pos}, {glow_color}, transparent 70%);
  }}
  .eyebrow{{position:absolute;top:60px;left:70px;font-family:ui-monospace,monospace;font-size:16px;color:{accent};letter-spacing:0.14em;}}
  h1{{position:absolute;top:96px;left:70px;width:{h1_width}px;font-size:{h1_size}px;font-weight:800;line-height:1.15;margin:0;color:#EDEEF0;}}
  .body{{position:absolute;top:{body_top}px;left:70px;width:{body_width}px;font-size:19px;color:#9BA1A6;line-height:1.55;}}
  .content{{position:absolute;top:{content_top}px;left:70px;width:1060px;}}
  .footer{{position:absolute;bottom:56px;left:70px;font-family:ui-monospace,monospace;font-size:15px;color:{accent};}}
  .row{{display:flex;gap:14px;flex-wrap:wrap;}}
  .chip{{font-family:ui-monospace,monospace;font-size:14px;color:#EDEEF0;border:1px solid #1B1D1B;border-radius:10px;padding:12px 18px;background:#0F1113;}}
  .chip b{{color:{accent};}}
  .check{{display:flex;align-items:center;gap:12px;font-size:17px;color:#EDEEF0;margin-bottom:12px;}}
  .check .mark{{color:{accent};font-weight:800;width:22px;}}
  .cross{{display:flex;align-items:center;gap:12px;font-size:17px;color:#4A4F54;margin-bottom:12px;}}
  .cross .mark{{color:#4A4F54;font-weight:800;width:22px;}}
  .cols{{display:flex;gap:60px;}}
  .col{{width:460px;}}
  .col h3{{font-family:ui-monospace,monospace;font-size:14px;letter-spacing:0.06em;margin:0 0 16px;}}
</style>
<div class="stage">
  <div class="eyebrow">{eyebrow}</div>
  <h1>{headline}</h1>
  {extra}
  <div class="footer">{footer}</div>
</div>
"""

def card(name, eyebrow, headline, extra, footer, accent="#00C805", glow_pos="85% 30%",
          glow_color="rgba(0,200,5,0.12)", h1_width=1000, h1_size=48, body_top=260,
          body_width=640, content_top=260):
    html = TEMPLATE.format(
        eyebrow=eyebrow, headline=headline, extra=extra, footer=footer, accent=accent,
        glow_pos=glow_pos, glow_color=glow_color, h1_width=h1_width, h1_size=h1_size,
        body_top=body_top, body_width=body_width, content_top=content_top,
    )
    with open(name + ".html", "w") as f:
        f.write(html)

# 1. Why BE
card("c1-why-be",
  "WHY BLOOM ENERGY",
  "We did not pick a random stock to quote against.",
  '<div class="body">BE is Bloom Energy &mdash; a real fuel-cell company powering a growing share of AI data centers. $INTERN quotes directly against it, no synthetic wrapper, no random ticker for the meme.</div>',
  "internburn.xyz/tokenomics", accent="#00C805")

# 2. BE vs USDG pools
card("c2-two-pools",
  "TWO REAL POOLS",
  "Trade against BE or USDG. Your choice.",
  '''<div class="content" style="top:250px;">
    <div class="row">
      <div class="chip"><b>$INTERN/BE</b> &mdash; quoted in tokenized Bloom Energy</div>
      <div class="chip"><b>$INTERN/USDG</b> &mdash; quoted in USDG</div>
    </div>
    <div class="body" style="position:static;width:900px;margin-top:24px;">Both permanently locked, both live since block one. No bonding curve, no migration, ever.</div>
  </div>''',
  "internburn.xyz/trade", accent="#00C805")

# 3. Audit honesty
card("c3-honesty",
  "TRANSPARENCY, NOT HYPE",
  "We will tell you what has not been audited.",
  '<div class="body">Staking and the burn bot have NOT had a professional security review yet. We say so on the site, not in fine print. Verify the code yourself &mdash; it is all open on GitHub.</div>',
  "github.com/CryptoBaba09/intern-project", accent="#D9A441", glow_color="rgba(217,164,65,0.12)")

# 4. Contract reference card
card("c4-contracts",
  "BOOKMARK THIS",
  "Every real address, in one place.",
  '''<div class="content" style="top:250px;">
    <div class="row" style="flex-direction:column;width:1000px;">
      <div class="chip"><b>$INTERN</b> &nbsp; 0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8</div>
      <div class="chip"><b>STAKING</b> &nbsp; 0xd73a24D7bd311E36151344E233a7e6C73369E558</div>
    </div>
  </div>''',
  "always verify on robinhoodchain.blockscout.com", accent="#00C805")

# 5. How to buy in 3 steps
card("c5-how-to-buy",
  "NEW HERE?",
  "Buying $INTERN takes three steps.",
  '''<div class="content" style="top:250px;">
    <div class="check"><span class="mark">1</span> Connect your wallet on internburn.xyz/trade</div>
    <div class="check"><span class="mark">2</span> Pick BE or USDG, enter an amount</div>
    <div class="check"><span class="mark">3</span> Confirm &mdash; it simulates first, so nothing signs blind</div>
  </div>''',
  "internburn.xyz/trade", accent="#00C805")

# 6. Build in public
card("c6-build-public",
  "BUILT IN THE OPEN",
  "No anonymous dev wallet you have to trust blindly.",
  '<div class="body">Every contract, every commit, every bug we have hit and fixed &mdash; public on GitHub. Including the mistakes. That is the deal with building something real instead of just deploying a token.</div>',
  "github.com/CryptoBaba09/intern-project", accent="#00C805")

# 7. Positioning checklist
card("c7-positioning",
  "MOST MEMECOINS VS $INTERN",
  "Vibes are easy. Mechanics are the hard part.",
  '''<div class="cols" style="position:absolute;top:250px;left:70px;">
    <div class="col">
      <h3 style="color:#4A4F54;">TYPICAL MEMECOIN</h3>
      <div class="cross"><span class="mark">&times;</span> Roadmap is a promise</div>
      <div class="cross"><span class="mark">&times;</span> "Utility" is a Discord role</div>
      <div class="cross"><span class="mark">&times;</span> Burns are a marketing screenshot</div>
    </div>
    <div class="col">
      <h3 style="color:#00C805;">$INTERN</h3>
      <div class="check"><span class="mark">&#10003;</span> Staking + trading, live today</div>
      <div class="check"><span class="mark">&#10003;</span> Utility is a deployed contract</div>
      <div class="check"><span class="mark">&#10003;</span> Burns are on-chain, checkable now</div>
    </div>
  </div>''',
  "internburn.xyz", accent="#00C805")

# 8. Is this a rug FAQ
card("c8-is-it-safe",
  "&quot;IS THIS A RUG?&quot;",
  "Fair question. Here is exactly why not.",
  '''<div class="content" style="top:250px;">
    <div class="check"><span class="mark">&#10003;</span> Liquidity locked forever &mdash; cannot be pulled, by anyone</div>
    <div class="check"><span class="mark">&#10003;</span> No mint function in the contract &mdash; supply can only fall</div>
    <div class="check"><span class="mark">&#10003;</span> Every burn and fee claim is a public transaction</div>
  </div>''',
  "check it yourself before you trust us on it", accent="#00C805")

# 9. Genesis progress (illustrative, not a live-data claim)
card("c9-genesis-progress",
  "GENESIS INTERNS",
  "500 NFTs. One gate: real trading volume.",
  '''<div class="content" style="top:260px;">
    <div style="width:1000px;height:20px;border-radius:10px;background:#1B1D1B;overflow:hidden;margin-bottom:16px;">
      <div style="width:7%;height:100%;background:#00C805;"></div>
    </div>
    <div class="body" style="position:static;width:900px;">No countdown timer, no launch date &mdash; just this bar. Track the live number at internburn.xyz/genesis.</div>
  </div>''',
  "internburn.xyz/genesis", accent="#00C805")

# 10. What a trade actually funds
card("c10-fee-breakdown",
  "WHAT A TRADE ACTUALLY FUNDS",
  "Every dollar of fees has a job.",
  '''<div class="content" style="top:250px;">
    <div class="row" style="flex-direction:column;width:760px;">
      <div class="chip"><b>70%</b> &nbsp; swapped for $INTERN and burned, permanently</div>
      <div class="chip"><b>20%</b> &nbsp; streamed to stakers as real BE</div>
      <div class="chip"><b>10%</b> &nbsp; treasury, for building what is next</div>
    </div>
  </div>''',
  "internburn.xyz/tokenomics", accent="#00C805")

print("wrote 10 cards")
