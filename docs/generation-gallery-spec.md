# Public generation gallery + pay-to-download — feature spec (v0, not built yet)

Idea: every video generated through `video-credits` (persona or custom
prompt) becomes visible to every user, with the ability for anyone
other than the original creator to download it by paying $INTERN.
Builds directly on the generation-history work that shipped
2026-09-11 (`generations` collection in MongoDB, see
`lib/videoCredits.js` and `docs/custom-video-prompt-spec.md`) — that
work was deliberately scoped to "private, each wallet sees only its
own" as the first step; this spec is the public extension.

## Why this needs its own spec, not just a visibility flag

Flipping `generations` from private to public isn't a one-line change
-- it changes the risk profile of nearly everything already built:

1. **Moderation bar goes up.** The existing prompt-level check
   (`moderatePrompt` in `api/blaze/generate/route.js`) screens the
   *text* before submission. A public gallery means the *video output*
   itself is now public-facing too -- a technically-innocent prompt can
   still produce a surprising result. Needs a review step on the output,
   not just the input, before something goes live in a gallery real
   users browse.
2. **Storage has to become permanent.** `generations.videoUrl` today is
   whatever the provider (Runway/HeyGen) returned -- observed to expire
   (the first real generation's Runway/CloudFront link carried roughly
   a 1-day signed expiry). A private "your own generations" list tolerates
   that poorly; a *public* gallery that's supposed to be purchasable
   cannot -- a link that dies before anyone pays for it is a real product
   failure, not a rough edge. Needs the video bytes re-hosted to
   permanent storage (Vercel Blob is already available on this
   project's Vercel account, unused so far -- natural fit) at generation
   time, not left on the provider's own CDN.
3. **A real payment/unlock mechanic, not just a display change.**

## Proposed mechanic: burn to unlock, not pay-the-creator

Two shapes this could take:

- **Burn-to-unlock (recommended):** paying to download someone else's
  generation burns $INTERN, same as every other mechanic in this
  project (Blaze's fee-burn, the video-credit burn itself, Forge's
  proposed deploy fee). No new payment rail, no escrow, no "does the
  original creator get a cut" question to design -- it's the same
  burn-a-fixed-or-priced-amount pattern already trusted everywhere
  else on this site.
- **Pay-the-creator:** the downloader's payment routes (in part or
  whole) to the original creator's wallet instead of/alongside burning.
  Real creator-incentive upside, but a materially bigger build: needs
  an on-chain payment or claim mechanism, handling what happens if the
  creator's generation gets flagged/removed after being paid for, and
  is a genuinely different product decision (this project pays out to
  *stakers* today, never to individual per-asset creators) -- flagging
  this as the fork that needs a person to choose, not defaulting to it.

This spec assumes burn-to-unlock unless told otherwise, because it's
the only version buildable without opening the creator-payout question.

## What "download" actually means once unlocked

Two options, not mutually exclusive:
- A time-limited signed URL to the permanently-hosted (Blob) file,
  generated per-unlock -- simplest, matches how the private version
  already links to a video.
- A recorded "this wallet unlocked this generation" entry, so a
  downloader doesn't have to pay twice for the same file on a repeat
  visit -- needs its own collection (`unlocks`: address + generationId).

## Open questions for a person, not an engineering default

- Burn-to-unlock price: flat (like the $1.50 generation cost) or
  creator-set per generation?
- Does the ORIGINAL creator get free access to their own generation
  forever (obviously yes) and does everyone see it's theirs (a public
  "made by 0x1234..." attribution), or is the gallery anonymous?
- What happens to a generation that fails moderation review *after*
  someone already paid to unlock it? Needs a refund answer before this
  ships, not after the first real complaint.

## What this spec does NOT cover

- The pay-the-creator variant above (explicitly deferred to a person's
  decision)
- Comments/likes/social features on gallery entries
- Any change to the *private* "your generations" view that already
  shipped -- that stays as-is regardless of what this becomes
