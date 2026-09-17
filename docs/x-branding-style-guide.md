# X branding style guide

Finalized 2026-09-17, after a direct comparison against Pons's own X presence
(@ponsdotfamily, 81.1K followers) — the platform $INTERN itself trades on, and
the best working example of disciplined crypto-brand posting visible from
this account today.

## What Pons does that we don't

Reviewed ~94 of their photos/videos. Almost every stat post is the exact same
template, just with the numbers and a color swapped:

- One square (1:1) card. Never landscape.
- A halftone/dot-grain texture as the background, in a flat color that
  encodes the metric type (green = growth/volume, red/pink = burn, black =
  meta/thread-marker cards).
- One giant bold number filling most of the card. No decoration competing
  with it.
- One short label above the number, small, regular weight.
- A tiny `ponsfamily.com` signature, bottom-left, barely noticeable.
- No mascot, no logo lockup on the card itself — just the number.

The result: every single post is instantly recognizable as theirs before you
even read it, because the *shape* never changes — only the number and the
color do. That discipline is the actual lesson here, not the specific green
they picked.

## What we already have that's worth keeping

- A real mascot with actual character IP (Blaze, Rendo, Promptly, Synapse).
  Pons has no mascot — just a wordless "P" mark. That's a genuine
  differentiator and should anchor our identity, not get dropped to imitate
  a competitor who doesn't have one.
- The existing dark green/black/amber palette (`#00C805` / `#0B0C0B` /
  `#D9A441`) already matches the live site. Switching wholesale to Pons's
  lime-halftone look would make us read as a Pons sub-brand instead of our
  own protocol — keep our own palette, borrow their *discipline*, not their
  *palette*.

## What's actually broken today

Checked `branding/*.html` directly: there are **nine** different one-off card
layouts (`x-card-stake`, `x-card-trade`, `x-card-live`, `x-card-roadmap`,
`x-card-mechanic`, `x-card-crew-live`, `x-card-be-sp500`,
`x-card-burn-to-create`, `x-card-pair-aws`), each hand-built from scratch with
its own layout. That's the opposite of Pons's one-template discipline, and
it's why the account has no consistent visual signature yet. One of them
(`x-card-pair-aws.html`) still references PAIR by name — dead since the
Sep 10 migration to Pons; retire it, don't reuse it.

## The finalized decision

Two templates going forward, not nine:

**1. Stat card (new, default for anything with a number in it)**
Everything that used to become a bespoke landscape card — burn count,
staked total, volume, migration progress, generation counts — becomes this
instead:

- 1080x1080, square.
- Background: `#0B0C0B` (existing dark), with the existing radial ember-glow
  treatment already used in `x-card-live.html` — not Pons's halftone, ours.
- One number, huge, bold, `#EDEEF0` on dark (or `#00C805` when the number
  itself is the good-news signal, e.g. burned/staked totals).
- One small mono label above it, `#4A4F54`, uppercase, matching the
  `.eyebrow` treatment already established in the existing cards.
- Blaze (or the relevant persona) small, bottom-right corner, in place of
  Pons's plain url signature — this is our version of "always the same
  shape," anchored on the mascot instead of a wordmark.
- `internburn.xyz` in mono, bottom-left, small — same weight as Pons's own
  signature, not louder.

**2. Explainer card (kept, for feature launches only)**
The existing 1200x675 landscape format (`x-card-stake.html`'s layout: eyebrow
+ headline + subhead + flow pills or stat row) stays, but only for genuine
feature explainers — a new page shipping, a mechanic changing. Not for
routine stat updates; that's what the new square template is for.

**Retire:** `x-card-pair-aws.html` (references a dead platform),
`x-card-mechanic.html` and `x-card-crew-live.html` folded into the explainer
template above rather than kept as separate one-offs.

## Next step

Build the square stat-card template as a real HTML file (same
render-to-PNG pipeline the existing cards already use) so the next stat post
uses it instead of another one-off. Not done yet — this doc is the decision,
not the build.
