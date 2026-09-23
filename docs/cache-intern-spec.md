# Cache — the Yield Intern (spec, NOT built or deployed)

Idea: deposit USDG straight into Morpho on Robinhood Chain — the exact
same lending rail Robinhood's own "Robinhood Earn" product runs on
(Morpho Vault → Morpho Markets, curated by Steakhouse Financial per
Morpho's own announcement of the Robinhood partnership). A small cut is
skimmed once, at deposit, auto-bought-back into $INTERN and burned —
same non-custodial pattern as $interndex's 0.2% swap fee, not a new
kind of contract risk.

Named 2026-09-23 (was "Vault" as a working name) — Cache, a cache/cash
pun, matches the crew's existing wordplay naming (Promptly = prompt +
promptly) rather than a flat literal name.

**Status as of 2026-09-23:** name, scope, and mechanic decided
(recorded below). No contract or frontend code written yet. Two real
things confirmed, one still open — see "What's confirmed" and "What's
NOT confirmed yet".

## Decided scope (v1)

- **Lending/vaults only, no borrowing.** Borrowing adds liquidation
  risk and health-factor UI that's a bigger, separate piece of work —
  ships later as its own phase if v1 proves out, same incremental
  pattern as Promptly (top-up live, pooled credits still in design) and
  Hush (swaps live, confidential-swap tech still in the lab.
- **USDG only.** The same asset Robinhood Earn itself lends through
  Morpho — tightest possible "we mirror Robinhood's own official rail"
  story, smallest integration surface for a first version. Other
  Morpho markets are a natural v2, not v1.
- **Fee: 0.2% skimmed once, at deposit**, immediately swapped to
  $INTERN and burned (sent to the dead address, same mechanic as every
  other burn in this protocol). Same rate as $interndex, by choice —
  not because the two fees are linked, just consistency. A withdrawal
  or performance-fee-on-yield model was considered and rejected for v1:
  it needs tracking a cost basis per position, more state, more surface
  area, for a fee model most users read as a bigger commitment than a
  clean deposit-time skim.

## Architecture (non-custodial, pass-through — not a vault of our own)

This project does **not** build or hold a custom pool. The contract's
whole job is: take USDG in, skim 0.2%, swap that cut to $INTERN and
burn it, then deposit the rest into Morpho's own real vault **with the
depositor's own wallet as the receiver** — so the Morpho vault shares
(the actual yield-bearing position) land directly in the user's wallet,
never in ours, even for a moment. Same shape as
`InternRewardsRouter.sol`'s `convert()` (this project's own established
"we route, we never custody" pattern) and $interndex's swap flow.

This depends on Morpho's real vault (ERC-4626-shaped) supporting a
`deposit(assets, receiver)` call where `receiver` can differ from
`msg.sender` — standard ERC-4626, expected to be there, **not yet
confirmed against the actual vault ABI** (see below).

Withdrawal needs no custom contract at all in v1: since the user holds
the real Morpho vault shares directly, they can withdraw straight from
Morpho's own interface/contract any time, with zero dependency on
anything this project builds or maintains. Simpler and safer than
routing withdrawals through a custom contract too.

## What's confirmed (2026-09-23, checked directly against docs.morpho.org/get-started/resources/addresses)

- Morpho Blue is genuinely deployed on Robinhood Chain:
  - Morpho core: `0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010`
  - Adaptive Curve IRM: `0x2BD3d5965B26B51814AC95127B2b80dD6CcC0fa1`
  - ChainlinkOracleV2 Factory: `0xB7c16F6F8cF531447Bf27Ca7220f981E79C9cdF2`
  - (A separate "Morpho Midnight" deployment also exists on Robinhood
    Chain at `0x6120765Ba5336150BbdDdD0Cd9108B5bFD369632` — a different
    Morpho product, not relevant here, noted only so it isn't confused
    with Morpho Blue above.)
- Robinhood Earn genuinely routes USDG through a Morpho Vault into
  Morpho Markets, curated by Steakhouse Financial (per Morpho's own
  blog post announcing the partnership).
- Aave has no confirmed Robinhood Chain deployment — checked, not
  found in Robinhood Chain's own day-one ecosystem-partner list or
  general search; Morpho is the only lending protocol confirmed live
  there, and it's the one Robinhood itself already uses.

## What's NOT confirmed yet — the real next step before any code

- **The specific MetaMorpho vault address for USDG** that Robinhood
  Earn actually deposits into. Morpho Blue above is the base layer
  (isolated markets, no single "vault" of its own) — the real
  depositor-facing vault is a separate MetaMorpho contract built on top
  of it, and that address hasn't been found yet. Needed before writing
  a single line of the deposit contract; without it there's nothing
  real to point at.
- Whether that vault's `deposit()` supports a distinct `receiver`
  argument (see Architecture above) — standard ERC-4626, expected, but
  "expected" isn't "confirmed against the real ABI", same discipline
  this project already applies everywhere else (e.g. lib/ponsPrice.js's
  own comment: "viem returns the decoded tuple directly... confirmed by
  testing the live endpoint before announcing this fixed, not assumed
  from the code alone").
- Real APY/TVL for that vault, to show honest live numbers on the
  frontend preview instead of a placeholder.

## Before this touches real user funds

Same bar this project already holds itself to for `InternRewardsRouter`
and `InternStakingRewards`: an in-house Slither pass plus manual review
at minimum, called out honestly as not a substitute for an independent
professional audit, before `DRY_RUN`-equivalent testing gives way to
real deposits. Not skipped, not rushed, same reasoning as everywhere
else real money moves in this codebase.
