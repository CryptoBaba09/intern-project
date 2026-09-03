# $INTERN Inference Credits — feature spec (v0, not built yet)

Idea: staked $INTERN earns a pro-rata share of real LLM inference credit
(Claude, GPT, Gemini, and everything else behind OpenRouter), funded by
protocol fees, with an equal-dollar amount of $INTERN burned every time
credit is issued. Modeled on [orbio.so](https://orbio.so) (live on
Robinhood Chain today), adapted to use staking instead of plain holding.

## Correcting the mental model up front

Orbio (and this spec) do **not** build a "compares 3-4 models and picks
the best one" engine. That intelligence, to the extent it exists, is
OpenRouter's own product — a unified API and billing layer in front of
Claude, GPT, Gemini, DeepSeek, and hundreds of other models. What this
feature actually does is **fund a spend-capped OpenRouter API key** for
eligible stakers. If "$INTERN evaluates outputs and routes to the best
model per task" is the real goal, that's a separate, harder, unscoped
product built on top of this — not something this feature provides on
its own.

## Why reuse `InternStakingRewards` instead of a new eligibility system

Orbio uses plain wallet-holding with a 1,000-token floor. This spec
recommends **staking** instead, for two reasons:

1. It reuses the exact contract and weighting already built and tested
   (`../contracts/contracts/InternStakingRewards.sol`) — the same staked
   balance that earns streamed BE also determines your share of the
   inference-credit pool. No second parallel eligibility engine.
2. `InternStakingRewards` already solved the JIT-gaming problem for BE
   rewards (stake right before a payout, exit right after — see that
   contract's "reward-sniping resistance" test). The same protection
   should extend to credit eligibility, or this reopens exactly the
   exploit that was already fixed once.

## Funding source

Recommendation: fund this from the **treasury bucket** (the 10% cut),
as a discretionary, team-directed initiative — not by re-splitting the
already-live, already-tested 70/20/10 creator-fee split. This keeps the
core protocol mechanics stable and treats inference credits as something
the team chooses to spend treasury funds on, the same way they'd choose
to spend on marketing.

Every time treasury BE is converted to OpenRouter credit (at face value,
like Orbio does — $1 of fees becomes $1 of inference), an equal dollar
amount of BE also gets swapped for $INTERN and burned. This is a
self-imposed rule, not a protocol-enforced one, unless it's later written
into a contract — worth deciding which before promising it publicly.

## Distribution mechanism

Mirrors Orbio's actual mechanic, substituting staked balance for held
balance:

1. On a fixed cadence (e.g. weekly), a job reads every staker's
   time-weighted average staked balance over the period from
   `InternStakingRewards`.
2. The period's credit budget (in USD) is split pro-rata by that
   weighting among stakers above a minimum floor (Orbio uses 1,000
   tokens; pick a floor here once $INTERN has a real price).
3. Each eligible staker's dashboard balance increases by their share.
4. A staker claims by provisioning an OpenRouter key capped at their
   current balance (Orbio caps a single tranche at $200 and lets users
   re-claim a fresh key once spent, rather than handing out one huge key).

## Technical flow

1. **Wallet-connect + signature auth** on the site (a prerequisite this
   shares with the [digital-avatars spec](./digital-intern-avatars-spec.md)
   — still not built).
2. **A backend + database** (also still not built — see the same gap in
   the avatars spec). This one additionally needs to enumerate stakers by
   indexing `Staked`/`Withdrawn` events from `InternStakingRewards`, since
   there's no "get all stakers" view function — a much narrower indexing
   problem than tracking all token holders generally, but a real one.
3. **An OpenRouter Provisioning API relationship** — a funded parent
   account and API access to mint spend-capped sub-keys programmatically.
   This is a real business relationship and real prepaid balance, not
   just a code integration.
4. **The burn-matching leg** reuses `intern-burn-bot`'s existing
   swap-and-burn code path (`lib/swap.js` swapping BE for $INTERN via
   PAIR's aggregator, then `lib/burn.js`) — triggered by the credit-funding
   event rather than the regular fee-split cycle.

## Real risks and open questions

- **Real dollar cost exposure.** Unlike everything else in this project,
  which is either a smart contract or a static site, this feature means
  a centralized party (whoever runs the OpenRouter account) is on the
  hook for real spend. A bug in the eligibility calculation is a
  real-money bug, not just a token-denominated one.
- **Same regulatory shape as BE distributions.** Paying token
  stakers a pro-rata share of protocol-funded value again resembles a
  revenue-share arrangement — the same Howey-adjacent consideration
  flagged for BE staking rewards applies here too, and isn't resolved by
  the payout being inference credit instead of BE.
- **JIT-gaming resistance must be deliberate**, not assumed. Time-weighting
  the staked balance (like Orbio does, and like `InternStakingRewards`
  already does for BE) is necessary; a naive point-in-time balance check
  would recreate the exact bug that was already caught and fixed once in
  this project's history.
- **Unit economics need real modeling** before committing publicly: how
  much treasury revenue vs. how much credit this hands out, at what
  staked-supply and fee-volume assumptions.

## Suggested sequencing if this gets greenlit

1. Get BE staking rewards live and audited first — this feature depends
   entirely on `InternStakingRewards` being trustworthy, since it reuses
   its staked-balance data as the source of truth.
2. Secure the OpenRouter Provisioning API relationship and model the unit
   economics with real fee-revenue numbers before promising anything
   publicly.
3. Build the staker-indexing job and the wallet-connect + claim UI as a
   scoped v1 — no tiers, no configurability, just "prove the loop works
   end to end with a small budget."
4. Decide whether the burn-matching rule stays a manual/off-chain policy
   or gets written into a contract once the mechanism is proven.
