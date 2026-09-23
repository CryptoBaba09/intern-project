# Cache Borrow — a real two-sided market for tokenized-stock collateral (spec, reviewed, NOT deployed)

**Status as of 2026-09-23: contract written, both sides of the market
(borrow AND supply), 33/33 tests passing, Slither clean (zero
High/Medium -- one informational unused-return finding reviewed and
documented inline, see the contract itself). Same review bar
`CacheVaultDeposit` cleared.** Neither contract is deployed. Market
selection (no market allowlisted yet) and an independent professional
audit are still open -- see below.

**Two-sided, on purpose.** Earlier drafts of this spec only covered
the borrow side, assuming liquidity would need to be bootstrapped
externally (by Cache's own treasury, or by waiting for it to show up).
Per direct instruction, the real model is simpler and more honest: any
user can `supply()` USDG directly into one of these same allowlisted
markets and earn yield from whoever borrows against the posted
collateral -- an actual two-sided market, not a borrow-only feature
waiting on someone else's capital. This is what "an Aave for tokenized
assets" actually means in practice, and it's why `CacheBorrow.sol` now
has `supply()`/`withdrawSupply()` alongside `depositCollateral()`/
`borrow()`/`repay()`/`withdrawCollateral()` -- same contract, same
allowlist, same non-custodial pattern, both sides of the trade.

## How this relates to Cache v1 (`CacheVaultDeposit.sol`)

Cache today is **supply-side only** — deposit USDG into the real
Steakhouse USDG Morpho vault, earn yield, 0.2% skimmed at deposit and
burned. There is no `borrow()`, no collateral posting, no liquidation
logic in that contract, and none is planned to be bolted onto it. This
doc is explicitly about a **separate, second contract** — Cache v1
stays exactly as reviewed (Slither-clean, 19/19 tests, `minShares`
slippage floor) whether or not this ever ships. Nothing here should
require touching `CacheVaultDeposit.sol`.

Why separate, not merged: `CacheVaultDeposit` is a pass-through with
zero custody risk beyond a single transaction — worst case if something
goes wrong is a reverted deposit. A borrow contract has to hold
collateral *between* transactions, is exposed to price moves and
liquidation, and depends on oracle correctness for user solvency. That
is a materially different risk class and deserves its own audit trail,
not inherited trust from Cache v1's review.

## What "lending/borrowing" actually means here

The user's framing was: "6th intern is essentially lending/borrowing —
say we need to enable tokenised stocks as collateral and users able to
borrow against them." Concretely, on Morpho Blue, that means a user:

1. Deposits a Robinhood Stock Token (TSLA, AAPL, NVDA, etc.) as
   **collateral** into a specific Morpho market via `supplyCollateral()`.
2. **Borrows** USDG against it via `borrow()`, up to that market's LLTV
   (loan-to-value ceiling).
3. Can `repay()` anytime, and `withdrawCollateral()` once their debt is
   covered.
4. If their position's health factor drops below 1 (collateral value
   falls, or they borrowed close to the ceiling), anyone can
   **liquidate** them — seize collateral at a discount to cover the bad
   debt. This is the risk `CacheVaultDeposit` simply does not have.

## The real market landscape today — queried directly, 2026-09-23

Queried Morpho's own market registry (`api.morpho.org/graphql`,
`chainId: 4663`) rather than assuming. Robinhood Chain has **100
Morpho Blue markets** live right now. Two real findings that should
drive scope:

### Finding 1: markets for this already exist, permissionlessly

Someone (Morpho itself, or an ecosystem bot) has already created
USDG-loan markets against nearly every Robinhood Stock Token —
TSLA, AAPL, NVDA, GOOGL, SPY, AMZN, DELL, EWY, HIMS, ORCL, ASML, INTC,
COST, MRNA, TTWO, IONQ, PLTR, and more, each with an oracle and a fixed
LLTV. **We would not need to create a new market or deploy a new
oracle to ship this** — the primitives are already live. The work is
choosing which existing market to point a contract at, and building the
full two-sided flow (supply/withdraw on the lender side,
depositCollateral/borrow/repay/withdrawCollateral on the borrower
side) against it.

### Finding 2: liquidity is thin and scattered, and multiple competing markets exist per ticker

Most of these 100 markets are literally $0 — dust/test markets, not
real liquidity. Of the ones with real money:

| Collateral | LLTV | Supply (USD) | Borrow (USD) | Oracle from known ChainlinkOracleV2 Factory? |
|---|---|---|---|---|
| USDe (stablecoin, not a stock) | 91.5% | $337.6M | $305.0M | No — different oracle type, expected for a stable pair |
| **AAPL** | 62.5% | **$239,055** | $101 | **No** — biggest stock-collateral pool on the chain, and its oracle is *not* confirmed from the trusted factory |
| pSPY-DEC27 | 62.5% | $10,000 | $0 | No |
| AI | 38.5% | $8,090 | $6,986 (86% utilized — real usage) | Yes |
| **TSLA (main)** | 62.5% | $6,560 | $1.52 | **Yes** — confirmed via on-chain factory event logs |
| wsNET | 38.5% | $1,602 | $171 | No |
| BIGTECH | 38.5% | $182 | $182 (100% utilized) | No |
| TSLA (competing market) | 77.0% | $15 | $12 | **No** |

(Full query + oracle-provenance check reproducible — see
`contracts/scripts/` for the pattern used: `eth_getCode` +
`getLogs` against the factory at
`0xB7c16F6F8cF531447Bf27Ca7220f981E79C9cdF2` for each candidate
oracle address, cross-checked against `api.morpho.org/graphql`.)

**What this means for scope:**

- **AAPL has the deepest real pool by far ($239K) but its oracle
  provenance is NOT yet confirmed as trustworthy** — the biggest
  temptation (deepest liquidity) is also the one needing the most
  due diligence before anyone points real user borrows at it. Do not
  default to it just because the number is biggest.
- **TSLA has two live markets with different LLTVs and different
  oracles** — the 62.5% one's oracle is confirmed from the known
  factory; the 77% one's is not. Never assume "the TSLA market" is
  singular — always specify which `MarketParams` (loanToken,
  collateralToken, oracle, irm, lltv) by full tuple, not by ticker.
- **Every one of these pools is currently too shallow to support real
  consumer borrow volume.** Even AAPL's $239K is sitting almost
  entirely idle ($101 borrowed — a 0.04% utilization rate). This is
  less of a blocker than it first looks, though: with `supply()` now
  live in the contract, real liquidity doesn't have to come from Cache's
  own treasury — any user can supply USDG directly and start earning
  yield the moment a market is allowlisted. The bootstrap problem is
  "will the first suppliers show up," not "do we have to fund it
  ourselves."

## Contract, tests, in-house review — done, 2026-09-23

- `contracts/contracts/CacheBorrow.sol` -- the architecture decided
  below, plus an owner-controlled market allowlist (by full
  `MarketParams` tuple, never by ticker) so a bad oracle or an
  unreviewed market can't be reached through this contract even if it
  exists on Morpho. `contracts/contracts/interfaces/IMorpho.sol`
  (minimal, only the functions actually called) and
  `contracts/contracts/mocks/MockMorpho.sol` (test double) alongside
  it.
- **Every function selector confirmed live on-chain, not assumed from
  docs.** `supplyCollateral`, `borrow`, `repay`, `withdrawCollateral`,
  `isAuthorized`, `supply`, `withdraw` -- all seven present in the real
  deployed bytecode at Morpho's core singleton
  (`0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010`), plus a live
  `isAuthorized(dead, dead)` read that executed successfully and
  returned `false` as expected. Same verification standard
  `CacheVaultDeposit`'s vault address got.
- **33/33 tests passing** (`contracts/test/CacheBorrow.test.js`) --
  allowlist gating, non-custody on both sides (every position, whether
  collateral, debt, or supplied liquidity, lands under the caller's
  own address in Morpho's ledger, never this contract's), the fee skim
  + slippage floor on both `borrow()` (`minReceived`) and `supply()`
  (`minSharesOut`), including the feeBps-changes-mid-flight scenario,
  the repay-refund-leftover path, and every owner-only admin function.
- **Slither: zero High/Medium findings.** One informational
  `unused-return` flag on `borrow()`'s discarded `sharesBorrowed`
  value -- reviewed and documented inline in the contract: this
  contract's fee math only needs `assetsBorrowed`, and Morpho tracks
  the caller's share-denominated debt internally regardless. Same
  cosmetic-only result class `CacheVaultDeposit` got. `supply()`'s and
  `withdrawSupply()`'s own return values are both fully used (returned
  and emitted), so neither triggered the same flag.
- **Still not an independent professional audit.** Same floor-not-
  substitute honesty as everywhere else real money moves in this
  codebase -- and given the liquidation/oracle risk here is
  categorically new (see below), an outside review matters more here
  than it did for Cache v1's pure pass-through.

## Architecture — custody question resolved, 2026-09-23

**Decision: direct per-transaction calls, `onBehalf = msg.sender` always. Never `setAuthorization()`. No standing custody or delegated authority, ever.**

The resolving fact: Morpho Blue's `borrow()` takes two separate
addresses — `onBehalf` (whose debt position it is) and `receiver`
(where the borrowed asset is actually sent). They don't have to match.
That's the whole mechanism this design leans on:

- `CacheBorrow.borrow(MarketParams, uint256 assets, uint256 minReceived)`
  — contract calls `Morpho.borrow(marketParams, assets, 0, onBehalf:
  msg.sender, receiver: address(this))`. The **debt position is
  recorded under the user's own address** in Morpho's own ledger, from
  the instant it's created — identical to what calling Morpho directly
  would produce. The **borrowed USDG lands at the contract for one
  instant**, in the same transaction: skim 0.2%, forward the rest to
  the user. Exactly the shape `CacheVaultDeposit.deposit()` already
  uses for its fee skim. Zero standing custody, zero new trust model.
- `CacheBorrow.depositCollateral(MarketParams, uint256 assets)` — pulls
  the stock token from the caller, calls `Morpho.supplyCollateral(
  marketParams, assets, onBehalf: msg.sender, data: "")`. Collateral
  position is the user's own from the instant it posts; the contract
  holds the token for one transaction only, same as always.
- `CacheBorrow.supply(MarketParams, uint256 assets, uint256 minSharesOut)`
  — the lender side, symmetric to `borrow()`: pulls USDG from the
  caller, skims 0.2%, calls `Morpho.supply(marketParams, netAssets, 0,
  onBehalf: msg.sender, data: "")`. The supply position (Morpho shares)
  is the caller's own from the instant it's created. `minSharesOut`
  guards the same share-price-movement risk `CacheVaultDeposit`'s
  `minShares` already guards.
- `repay(MarketParams, uint256 assets, uint256 shares, uint256 maxAssetsIn)`
  / `withdrawCollateral(MarketParams, uint256 assets)` /
  `withdrawSupply(MarketParams, uint256 assets, uint256 shares)` — same
  direct `onBehalf: msg.sender` pattern. No fee on any of the three
  (see below). These could arguably be called straight against Morpho
  from the frontend with no contract in the middle at all, since
  there's no fee to intercept — worth deciding once the frontend
  framework for this exists, not a contract-design question.

**Explicitly rejected: the delegated-operator model.** Morpho also
supports `setAuthorization(address operator, bool)`, letting a user
grant a contract standing permission to act as `onBehalf` for them
indefinitely — this is what would be needed for e.g. batched actions or
Cache managing a position without a fresh signature every time. Not
using it: an authorized operator can call `borrow()` or
`withdrawCollateral()` in the user's name on *any future transaction*,
not just the one currently being signed — a materially larger blast
radius than this codebase accepts anywhere else (`InternRewardsRouter`,
`CacheVaultDeposit` both hold funds for one transaction and nothing
more; this preserves that exact bar). Every action here needs the
user's own signature on that specific transaction, same UX bar as
deposit/swap/convert already ship at.

**Fee — confirmed, mirroring the existing deposit fee exactly:**

One-time 0.2% skim, applied symmetrically on both sides where capital
actually enters to do work: on `borrow()` (borrow 1,000 USDG → user
receives 998, 2 goes to `feeRecipient`), and on `supply()` (supply
1,000 USDG → 998 actually earns yield). Not an ongoing spread on the
interest rate either way. Rejected the interest-rate-markup shape
deliberately: Morpho's interest rate model is fixed per market at
creation, so a spread on top would mean `CacheBorrow` independently
tracking accrued interest per position outside Morpho's own
accounting — real new state, real new bugs, a much bigger audit
surface for a fee that's meant to be simple. The one-time skim needs
none of that, and matches the "fee taken once, at the point value
moves" shape every fee in this codebase already uses (2% on Pons
swaps, 0.2% on $interndex swaps, 0.2% on Cache deposits).

Skimmed USDG accumulates at `feeRecipient` and gets swapped-and-burned
via the same existing manual cycle `CacheVaultDeposit` already uses —
not an inline USDG→ETH swap-and-burn inside the transaction itself,
same reasoning as `CacheVaultDeposit`'s own NatSpec: $INTERN v2 only
trades against native ETH pre-graduation, so bolting a swap router on
for a fee that's a rounding error isn't worth the widened audit
surface.

**No fee on `supplyCollateral()`, `repay()`, `withdrawCollateral()`, or
`withdrawSupply()`.** Posting collateral isn't extracting value — it's
a prerequisite step before borrowing. Withdrawing (either side) is
just closing a position already paid for at entry, not a new
value-creating action. Same principle Cache v1 already applies (fee at
deposit, none at withdrawal).

## Risk surface this introduces (does not exist in Cache v1)

- **Liquidation risk to the user.** A price drop in their collateral
  can get them liquidated — real value loss, not a hypothetical. Needs
  a health-factor display, warnings before a borrow that would leave
  a position close to the LLTV edge, and clear, honest copy about what
  "borrowing against your TSLA" actually risks. This is a materially
  bigger disclosure obligation than anything Cache v1 or
  `InternRewardsRouter` carries.
- **Oracle risk.** Confirmed above: not every candidate market's oracle
  is from the known, previously-vetted factory. An unvetted oracle in
  a live borrow market is a classic exploit vector (stale price,
  manipulable source, wrong decimals) — every market this project
  actually points users at needs its oracle individually verified, not
  assumed safe because "Morpho" is in the name.
- **Bad debt risk.** If liquidations don't happen fast enough (thin
  liquidity for the collateral asset itself makes liquidation harder,
  not just borrowing), Morpho markets can accrue bad debt that's
  socialized across suppliers to that specific market. Worth checking
  each candidate market's own liquidation history/bad-debt field
  (the GraphQL schema exposes `badDebt` and `realizedBadDebt` per
  market — not pulled yet, should be part of final market selection).
- **Thin-liquidity risk to us, not just users.** Even if we build this
  well, most candidate markets can't support meaningful borrow volume
  today. Either we (or Cache's own depositors) become the liquidity
  supplying these specific markets — which changes Cache v1's own risk
  profile (its USDG currently flows into Steakhouse's diversified
  curation, not a single stock-collateral market) — or this ships and
  mostly sits unused until organic liquidity shows up.

## Resolved

1. ~~Does a contract need to hold anything, or can the frontend call
   Morpho directly?~~ **Resolved 2026-09-23** — see Architecture above.
   Direct per-transaction calls, `onBehalf = msg.sender` always,
   `receiver = address(this)` only on `borrow()` to intercept the fee.
   No `setAuthorization()`, no standing custody.
2. ~~Fee model — skim on borrow, on repay, neither?~~ **Confirmed
   2026-09-23** — one-time 0.2% skim, symmetric on both `borrow()` and
   `supply()`, mirroring the existing deposit fee exactly. No ongoing
   interest-rate spread, no inline buy-and-burn (accumulates and burns
   via the existing cycle, same as the deposit fee). See Architecture
   above.
3. ~~Ship straight to production for live testing, skipping review?~~
   **Explicitly declined, 2026-09-23** — same bar as every other live
   contract here: build, unit-test, Slither + manual review, then a
   real canary deploy is a valid final check, not a substitute for any
   of the above. `CacheVaultDeposit.sol`'s own deployment stays paired
   with `CacheBorrow.sol`'s rather than shipping the already-reviewed
   one alone, per instruction.
4. ~~Do we supply our own liquidity into these markets?~~ **Resolved
   2026-09-23** — no treasury bootstrap needed. `supply()` lets any
   user park their own USDG directly into an allowlisted market and
   earn yield from real borrowers — a genuine two-sided market, not a
   borrow-only feature waiting on Cache's own capital.

## Open questions — still need answers before this becomes a real spec

1. **Which markets, exactly** — full `MarketParams` tuples, not
   tickers — does v1 support? Recommend starting with only markets
   whose oracle is confirmed from the known factory AND have nonzero
   real liquidity today (from the table above, that's currently just
   TSLA-62.5% and AI, both thin). Everything else needs either deeper
   oracle vetting or waiting for real liquidity to show up. The
   contract's owner-controlled allowlist (`setMarketAllowed`) is built
   for exactly this — no market is reachable until explicitly approved.
2. **Liquidation UX** — health factor display, warning thresholds,
   whether this project's frontend proactively warns users approaching
   liquidation (a real UX/ops commitment, not just a contract feature).
3. **Audit bar** — Slither + manual review in progress now. Given the
   liquidation/oracle risk is categorically new to this codebase, an
   outside review before any real user funds touch it is a much
   stronger recommendation here than it was for Cache v1's pure
   pass-through.

## What's NOT done

- **Market selection.** No market allowlisted yet -- `setMarketAllowed`
  exists and is tested, but nothing has actually been approved for
  real use. Per the table above, only TSLA-62.5% and AI currently pass
  both bars (real liquidity + a factory-confirmed oracle).
- **Frontend.** No borrow/repay/collateral UI wired yet.
- **Independent professional audit.** In-house review is done for both
  Cache contracts now; neither has had outside eyes.
- **Deployment.** Both `CacheVaultDeposit.sol` and `CacheBorrow.sol`
  have now cleared the same in-house review bar -- the deploy decision
  itself is separate and still needs an explicit go-ahead, not implied
  by the review passing.
