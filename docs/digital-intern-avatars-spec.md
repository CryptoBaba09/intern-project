# Digital $INTERN Personas — feature spec (v0, not built yet)

Idea: $INTERN holders/stakers unlock a personal AI avatar ("digital intern")
for content creation, powered by HeyGen, gated by tier.

## Why staking, not just holding

Reuse the same primitive `InternStakingRewards` already gives us — a
staker's tier is read straight from `balanceOf(address)` on that contract,
no new indexer or balance-tracking system needed. Gating by *stake* rather
than wallet balance also closes the obvious abuse case: without it,
someone could buy a large balance right before a tier check and dump it
right after, "renting" a tier for a few seconds the same way the reward
contract's JIT-sniping bug let people rent a share of a distribution.
Requiring the balance to be *staked* (locked into the contract, checked
live) makes that meaningfully more friction-y, though see "Open
questions" below — it doesn't fully close the door on its own.

## Proposed tiers (illustrative numbers — revisit once $INTERN has a real price)

| Tier | Stake required | Unlocks |
| --- | --- | --- |
| Intern | 10,000 $INTERN | 1 avatar template, basic monthly video-minute credits |
| Senior Intern | 100,000 $INTERN | More templates, higher credit allowance |
| Full-Time Offer | 1,000,000 $INTERN | Full customization, highest credits, priority rendering |

Naming leans into the existing "intern" bit (a promotion ladder) rather
than generic "Bronze/Silver/Gold" — matches the site's voice.

## High-level flow

1. User connects a wallet on the site. **This is a real prerequisite that
   doesn't exist yet** — the current "CONNECT WALLET" button on
   `intern-site` is a disabled placeholder. Building this feature means
   building real wallet-connect first (e.g. via wagmi/viem + a connector
   library), which is itself non-trivial scope.
2. A server-side check (Next.js API route or similar) reads the
   connected address's `balanceOf` on `InternStakingRewards` — a free
   view call, no gas — to determine tier. Must happen server-side so tier
   logic and the HeyGen API key are never exposed client-side.
3. If eligible, the user picks a template + provides a script/text; the
   backend calls HeyGen's API to generate the video and returns it.
4. Usage (video-minutes/month) is metered per tier, which means a real
   backend + database — `intern-site` today has neither. This is new
   infrastructure, not a page.

## Open questions / real blockers before this ships

- **No wallet-connect exists yet.** Prerequisite, not part of this
  feature per se, but blocks it.
- **No backend/database exists yet.** `intern-site` is currently a static
  marketing site. Usage metering needs persistent state.
- **HeyGen cost model.** Each generation costs real money on HeyGen's
  side. Tiered "credits" need unit economics worked out (cost per
  generation vs. expected demand per tier) before launch, or this becomes
  a money-losing perk.
- **Tier-gaming resistance.** A live `balanceOf` check is gameable by
  staking right before use and unstaking right after, since there's no
  minimum staking *duration* enforced anywhere yet (only the reward
  streaming is time-weighted; tier eligibility as sketched above is not).
  Worth deciding whether tier requires staking held for some minimum
  duration before it counts, similar in spirit to the reward contract's
  anti-sniping fix.
- **HeyGen API access/pricing plan** needs to actually be procured
  (this doc assumes API access exists or is attainable — verify before
  committing to this as a roadmap item with a date).

## Suggested sequencing if this gets greenlit

1. Ship real wallet-connect on `intern-site` (useful independent of this
   feature — the swap widget's "CONNECT WALLET" button needs it too).
2. Add a minimal backend (Next.js API routes + a small database) purely
   for reading on-chain tier + metering usage.
3. Integrate HeyGen for one template, one tier, no customization — prove
   the unit economics before building the full 3-tier system.
4. Expand tiers/templates once the economics and demand are validated.
