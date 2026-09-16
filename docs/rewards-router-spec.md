# Choose your reward asset — spec + code, NOT deployed

Idea: when you claim your earned BE from `InternStakingRewards`, optionally
convert it into a real Robinhood Stock Token — TSLA, NVDA, or SPCX today,
more later — instead of holding BE. "Interns are always useful, in
whatever form is useful to you" is the framing: the same claimed BE, your
choice of shape.

**Status as of 2026-09-16:** `contracts/contracts/InternRewardsRouter.sol`
exists and is unit-tested (`contracts/test/InternRewardsRouter.test.js`,
against a mock swap router — Uniswap's own AMM math is out of scope for
these tests, deliberately; they test this contract's allowlist/approval/
recipient/slippage logic, not Uniswap's). **Not deployed** — same
"unit-tested but not professionally audited" gate as everything else this
site discloses before it goes live with real value. A preview showing what
this would look like (clearly marked NOT LIVE) is on the stake page — see
`components/RewardChoicePreview.js`.

## Why this doesn't touch `InternStakingRewards`

That contract holds real staked value right now. Rewriting its core reward
math (stake, withdraw, `earned()`, the streaming accumulator) to support
four reward tokens instead of one would mean a new contract, a new
migration, and a bigger audit surface — right after finishing the v1→v2
migration and fixing a live staking bug. Wrong sequencing.

Instead, the choice moves to **claim time, not stake time**:

1. Stake, earn, claim BE — exactly as today, nothing changed.
2. Optionally, call `convert()` on the new router with the BE you just
   claimed, choosing a target asset. One approval, one swap, lands
   directly in your wallet.

The router never calls `getReward()` on anyone's behalf (it can't —
`InternStakingRewards` has no delegated-claim mechanism, and this router
doesn't add one) and never touches staked `$INTERN`. Each conversion is
sized to one user's own claim, not a pooled treasury-scale swap — a much
smaller blast radius than redesigning the distribution pipeline itself.

## The real swap path (verified, not guessed)

Checked directly against live chain state on 2026-09-16, via GeckoTerminal
and Robinhood's own official token-contract registry
(`docs.robinhood.com/chain/contracts`):

| Asset | Pool | Fee tier | Liquidity | 24h volume |
|---|---|---|---|---|
| BE/USDG | `0x1ba...1f16` | 0.30% | ~$135.7K | ~$215K |
| TSLA/USDG | `0xf4a...89e3` | 0.30% | ~$1.1M | ~$914K |
| NVDA/USDG | `0xd4e...14a3` | 0.05% | ~$7.2M | ~$20.7M |
| SPCX/USDG | `0xc61...0029` | 0.05% | ~$3.2M | ~$18M |

All real Uniswap V3 pools, all reachable through the same live
SwapRouter02 deployment (`0xCaf681a66D020601342297493863E78C959E5cb2`)
`intern-burn-bot/lib/swapEthForBe.js` already calls today for the bot's own
BE purchases. Every target pool here is deeper than BE's own pool — this
is, if anything, a lower-slippage path than what the bot already runs in
production.

Every conversion is exactly two hops: `BE -> USDG -> target`. USDG is the
shared quote currency every one of these Stock Token pools is denominated
in, so there's no need to route through WETH at all.

## Real risks and open questions

- **Real AMM slippage** on every conversion — `convert()` takes a caller-
  supplied `minAmountOut`, same shape as every other slippage-protected
  swap, but the frontend needs to quote a real number via Uniswap's
  QuoterV2 before submitting, not just default to 0.
- **Owner-managed allowlist is a centralization point.** `setTargetAsset`
  is owner-only — same "who holds this key" question already flagged for
  `InternStakingRewards`'s own owner (a single EOA today, not a
  multisig — see the 2026-09-16 security review). Worth fixing for both
  at once rather than separately.
- **A new contract touching real BE and real Stock Tokens is a new audit
  surface**, even though it never touches staked `$INTERN` or the
  distribution pipeline. "It's contained" is not a substitute for review.
- **Phase 2 (not started, not designed in detail):** if most stakers would
  rather hold ongoing TSLA/NVDA/SPCX exposure than manually convert each
  claim, a real multi-reward-token streaming design becomes worth its own
  cost — but only once Phase 1 shows that demand exists.

## Suggested sequencing

1. Ship Phase 1's preview (this doc, `RewardChoicePreview.js`) so the idea
   is visible and marketable before it's live — "coming, here's exactly
   how" beats a vague roadmap bullet.
2. Get `InternRewardsRouter.sol` (and ideally `InternStakingRewards`'s
   ownership) in front of a real security review.
3. Deploy, wire the frontend's real quote-then-convert flow, go live.
4. Watch real usage before ever starting Phase 2's design.
