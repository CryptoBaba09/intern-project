# $INTERN Tiered Loyalty Rewards — feature spec (v0, not built yet)

Idea: a recurring 5% cut of treasury BE revenue, distributed to stakers
in tiers by staked amount — a growth/loyalty program layered on top of
the existing 20% BE staking distribution, funded from the treasury
bucket (framed as marketing/growth spend, not a change to the core
70/20/10 protocol split).

## Relationship to the existing 20% distribution

This is **separate and additional**, not a replacement:

| | Funding | Weighting | Contract |
|---|---|---|---|
| Existing (live design) | 20% of every creator fee claim | Linear — proportional to staked $INTERN, no minimum | `InternStakingRewards` |
| This spec | 5% of treasury BE, discretionary/recurring | Tiered — a minimum floor, then weighted by tier | New: `InternLoyaltyRewards` |

Keeping them separate means this can be paused, adjusted, or scrapped
without touching `InternStakingRewards` — which by the time this is
built, should already be live, audited, and holding real staked value.
Reusing a proven pattern instead of reopening it is the point.

## Tiers

| Tier | Staked $INTERN | Weight |
|---|---|---|
| Not eligible | < 2,500 | — |
| Tier 1 | 2,500 – 4,999 | 1x |
| Tier 2 | 5,000 – 9,999 | 1.5x |
| Tier 3 | 10,000+ | 2x |

A wallet's share of each cycle's pool = `(its weight × its staked balance) / sum of (weight × staked balance) across all eligible wallets`. Exact thresholds/weights are illustrative — revisit once $INTERN has a real price and real staked-supply distribution.

## Mechanism

`InternLoyaltyRewards` reads staked balances from the already-deployed
`InternStakingRewards` (a simple external view call — `balanceOf(address)`)
rather than tracking its own separate staking ledger. It does **not**
hold or move $INTERN itself; it only manages BE reward accounting and
payout, the same separation of concerns `InternStakingRewards` already
has for its own reward token.

Distribution reuses the exact same streaming approach already built and
proven in `InternStakingRewards` (Synthetix-style linear streaming over a
`rewardsDuration`, with the same JIT-sniping resistance) — the tier
weighting changes *how much* of a stream a wallet is entitled to, not
*whether* rewards can be sniped by staking right before a deposit and
exiting right after. The anti-sniping property has to be re-verified for
this contract specifically, not assumed to carry over just because the
pattern is copied.

## Funding cadence

Recommended: **weekly**, called by the treasury wallet (or the same bot,
if the team prefers automating it) via a `notifyRewardAmount`-equivalent
call, depositing that week's 5% cut. This is a discretionary, human-
approved action (ideally from the treasury Safe once/if that's set up),
not an automatic on-chain split like the core 70/20/10 — the team decides
each cycle whether and how much to fund it.

## Real risks and open questions

- **A second contract holding pooled funds is a second full audit
  surface.** Do not treat "it reuses a proven pattern" as a substitute
  for reviewing this contract on its own terms — the tier-weighting logic
  is new code, not copied code.
- **Tier thresholds can be gamed the same way stake-based eligibility
  always can** unless the same time-weighting already used for the core
  BE distribution is applied consistently here too — a wallet buying into
  Tier 3 right before a weekly snapshot and dropping back after should
  not receive Tier 3's full weight for that cycle.
- **This is a second recurring cost decision for the team**, on top of
  the 70/20/10 split, LLM inference credits (if built), and anything
  else funded from the treasury's 10%. Model whether treasury inflow can
  actually sustain 5% here plus everything else already planned before
  committing to a rate publicly.
- **Same regulatory shape as the other BE-denominated payouts** already
  flagged for the core staking distribution — tiered, stake-weighted
  payouts from protocol/treasury revenue read the same way regardless of
  which contract pays them out.

## Suggested sequencing

1. `InternStakingRewards` live, audited, holding real staked value —
   this spec depends on it as a data source and as a proof that the
   underlying pattern works in production, not just in tests.
2. Model the actual treasury inflow rate before committing to "5%"
   publicly — adjust the number if the real numbers don't support it.
3. Build `InternLoyaltyRewards` with its own full test suite (including a
   dedicated JIT/tier-gaming test, not an assumption the existing one
   covers it) and its own audit before real BE flows through it.
