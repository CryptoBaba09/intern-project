# Custom-prompt video generation — feature spec (v0, not built yet)

Idea: extend the live `video-credits` feature (burn $INTERN → real video
generation, see `../intern-site/src/app/api/blaze/generate/route.js`)
with a mode that isn't anchored to one of the 4 personas — a plain
text-to-video prompt, burn-gated the same way. This is what would let
someone (including us, for one-off marketing clips like an evolution-
themed teaser) generate arbitrary video content through the site
itself, as a real user action, instead of through the Runway Agent web
UI by hand.

## What already exists vs. what this adds

The current route already takes a **freeform `prompt` string** — it's
just always paired with a **fixed reference image** picked from
`PERSONA_SCENES[persona][scene]` (Runway) or a fixed HeyGen avatar ID.
So today's feature is "freeform motion/script, fixed character" — not
"fully freeform video."

This spec adds a second mode: `persona: null` / a `custom: true` flag
that skips the persona/scene lookup entirely and calls Runway's
generation endpoint **without** a `promptImage` — pure text-to-video.
The existing Model Router config (`intern-video-credits`, see
dev.runwayml.com) already picks the cheapest eligible model per
request shape, so dropping the image input should just make it route
to a text-to-video-capable model automatically — no separate provider
integration needed, same secret, same router.

## Why this needs a real safety design, not a quick add

Every existing generation is anchored to one of 4 pre-approved
character stills the team controls. This mode removes that anchor —
a stranger's wallet, burning real $INTERN, can make the site call a
paid AI video provider with **any text they type**, and whatever comes
back is generated using $INTERN's own provider account and (if shown
anywhere on-site) carries $INTERN's name. That's a materially
different risk than the rest of this beta, and it's the reason this is
a spec first, not a same-day patch.

## Proposed mechanic

| | Value | Notes |
|---|---|---|
| Cost | Same $1.50 video-credit cost as persona mode, to start | Revisit once real provider invoices exist — a fully custom generation may cost the operator more or less than a persona one depending which model the router picks |
| Gating | Same `videoCredits.js` burn-to-credit balance already live | No new ledger |
| Prompt length | 500 chars, same cap as today | |
| Reference image | None — pure text-to-video | Keeps this v0 scoped; user-uploaded reference images are a separate, larger feature (image hosting + moderating *uploaded* content, not just text) |

## Moderation — the part that actually needs deciding before this ships

Two layers, neither optional:

1. **Pre-submission check.** Run the prompt through a moderation
   classifier *before* spending a credit or calling Runway. Simplest
   real option: OpenAI's moderation endpoint (free, no completions
   cost) — needs `OPENAI_API_KEY` set server-side either way for the
   already-planned inference-credits feature, so this doesn't add a
   new provider dependency once that lands. Until that key exists,
   the honest fallback is a plain keyword denylist, documented in code
   as exactly that (a keyword filter, not real classification) — not
   silently claimed as "moderated."
2. **Explicit acknowledgment.** A checkbox before the burn: "I won't
   generate real people, hate/harassment, sexual, or illegal content;
   $INTERN can reject or remove any output." Doesn't replace layer 1,
   but establishes the user agreed to terms before spending, which
   matters if content ever needs to be pulled after the fact.

**Open question, genuinely for a person to decide, not an engineering
default:** are generations ever shown anywhere other than back to the
wallet that made them (a public gallery, X auto-post, etc.)? If they
stay private-to-the-submitter, the blast radius of a bad generation is
one person's own view — still worth moderating, but not an urgent
takedown-pipeline problem. If any output could go public automatically,
that changes the moderation bar considerably (need a review step before
anything public-facing, not just at submission).

## What this spec does NOT cover

- User-uploaded reference images (separate feature, separate risk —
  moderating an uploaded *image* is a different problem than moderating
  *text*)
- Rate limiting beyond the existing per-wallet credit balance (worth
  adding — e.g., N generations/day — but not blocking v0)
- A public gallery/showcase of generations (explicitly out of scope
  above; build the private version first)
