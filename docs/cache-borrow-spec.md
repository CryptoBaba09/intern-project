# Cache Borrow — lending against stock-token collateral (spec, NOT built)

**Status as of 2026-09-23: scoping only.** No contract, no market
selection, no oracle sign-off, no UI. This doc exists because deploying
`CacheVaultDeposit` (see `docs/cache-intern-spec.md`) was deliberately
put on hold until this side is designed too, per direct instruction —
"hold all deployment until borrow is designed too." This is the start
of that design, not a finished plan.

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
supply-collateral/borrow/repay/withdraw flow against it.

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
  entirely idle ($101 borrowed — a 0.04% utilization rate). Shipping a
  "borrow against your TSLA" UI today would either show users an empty
  market, or work for genuinely small amounts only. This is a real
  liquidity-bootstrap problem, not just a UI problem — see "Open
  questions" below.

## Architecture sketch (not final, not written)

A new contract, tentatively `CacheBorrow.sol`, calling Morpho Blue's
core singleton (`0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010`, same one
`CacheVaultDeposit` already points at for the read side) directly —
same non-custodial philosophy as everything else in this codebase:

- `depositCollateral(MarketParams, uint256 assets)` — pulls the stock
  token from the caller, calls `supplyCollateral()` with the caller as
  the actual position owner on Morpho (not this contract), same
  `msg.sender`-as-beneficiary pattern as `CacheVaultDeposit.deposit()`.
- `borrow(MarketParams, uint256 assets, uint256 minAssetsOut / maxSharesIn)` —
  borrows USDG against posted collateral, sent to the caller.
- `repay(MarketParams, uint256 assets)` — standard.
- `withdrawCollateral(MarketParams, uint256 assets)` — standard, blocked
  by Morpho itself if it would leave the position unhealthy.

Whether this needs to hold any custody at all (Morpho Blue supports
suppling collateral and borrowing directly on behalf of `onBehalf`
addresses with signed authorization — worth checking if a contract
even needs to sit in the middle, versus the frontend calling Morpho
directly and this contract only handling the $INTERN fee-skim leg,
mirroring how `CacheVaultDeposit` only wraps the deposit call). This is
the single biggest open architecture question and should be resolved
before writing any Solidity — see Open questions.

**Fee**: not decided. A skim on borrow (like the 0.2% on deposit) is
the obvious mirror of Cache v1, but taking a cut denominated in newly
borrowed debt is a different economic shape than a cut on a deposit —
needs its own reasoning, not a copy-paste of the existing model.

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

## Open questions — need answers before this becomes a real spec

1. **Does a contract even need to hold anything, or can the frontend
   call Morpho Blue directly** (with this project's contract only
   handling an optional fee-skim leg)? Resolves most of the custody
   risk question above either way.
2. **Which markets, exactly** — full `MarketParams` tuples, not
   tickers — does v1 support? Recommend starting with only markets
   whose oracle is confirmed from the known factory AND have nonzero
   real liquidity today (from the table above, that's currently just
   TSLA-62.5% and AI, both thin). Everything else needs either deeper
   oracle vetting or waiting for real liquidity to show up.
3. **Do we supply our own liquidity** into whichever markets we pick
   (bootstrapping the borrow side with Cache's own or treasury USDG),
   or only build the UI and accept it may show near-empty markets at
   launch?
4. **Fee model** — skim on borrow, on repay, neither? Needs its own
   reasoning.
5. **Liquidation UX** — health factor display, warning thresholds,
   whether this project's frontend proactively warns users approaching
   liquidation (a real UX/ops commitment, not just a contract feature).
6. **Audit bar** — this needs at least the same Slither + manual review
   floor as everything else, but given the liquidation/oracle risk is
   categorically new to this codebase, an outside review before any
   real user funds touch it is a much stronger recommendation here
   than it was for Cache v1's pure pass-through.

## What's NOT done

Everything except this scoping doc and the on-chain market/oracle
research above. No contract, no market finalized, no fee model, no UI,
no audit. `CacheVaultDeposit.sol` deployment stays on hold until this
gets real answers to the open questions above, per instruction.
