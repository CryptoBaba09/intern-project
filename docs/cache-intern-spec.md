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

**Status as of 2026-09-23:** name, scope, mechanic, and the real target
vault are all decided/confirmed (recorded below). No contract or
frontend code written yet — that, plus a security review, is what's
actually left before this can touch real funds. See "What's confirmed",
"The USDG vault address", and "What's still NOT done".

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

## The USDG vault address — found, 2026-09-23

**Steakhouse USDG**, the real MetaMorpho vault Robinhood Earn deposits
into: `0xBeEff033F34C046626B8D0A041844C5d1A5409dd` on Robinhood Chain,
curated by Steakhouse Financial. Verified directly against its live
page at `app.morpho.org/robinhood-chain/vault/0xBeEff033F34C046626B8D0A041844C5d1A5409dd/steakhouse-usdg`
(not just a search snippet) -- real deposits shown, $493.4M TVL, 3.91%
net APY at time of check. This closes the address gap; the contract
now has something real to point at.

## Contract, tests, in-house review — done, 2026-09-23

- **Contract written.** `contracts/contracts/CacheVaultDeposit.sol` --
  the deposit-skim-forward pattern described above, non-custodial,
  `receiver = msg.sender` on the vault call.
- **The vault's `deposit()` receiver argument -- confirmed live, not
  assumed.** Checked two ways directly against Robinhood Chain mainnet
  on 2026-09-23: (1) the runtime bytecode at
  `0xBeEff033F34C046626B8D0A041844C5d1A5409dd` contains the
  `deposit(uint256,address)` selector (`0x6e553f65`), plus `asset()`,
  `previewDeposit()`, `convertToShares()`, `maxDeposit()` -- the full
  standard ERC-4626 surface, not a partial/custom one; (2) a live
  read-only call to `asset()` returned
  `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` -- the exact same USDG
  address this codebase already uses for `InternRewardsRouter`'s
  deployment, a real cross-check, not a coincidence worth ignoring if
  it *hadn't* matched. This was the one open architecture question;
  it's closed.
- **In-house security review -- done, same bar as `InternRewardsRouter`
  and `InternStakingRewards`.** Slither static analysis: zero
  High/Medium findings, only cosmetic/informational ones (a
  constructor-param shadowing an inherited private var, two
  naming-convention nits, OpenZeppelin's own pragma/assembly
  boilerplate) -- nothing actionable. Manual review beyond what Slither
  flags caught one real gap: `deposit()` originally had no slippage
  floor, unlike `InternRewardsRouter.convert()`'s `minAmountOut` --
  fixed by adding a `minShares` parameter that reverts
  (`SlippageTooHigh`) if the vault would mint fewer shares than the
  caller specifies. 19/19 tests passing after the fix (two new tests
  cover the revert path and the exact-match boundary).
- **This is still not an independent professional audit.** Same
  honesty this project applies everywhere else real money moves:
  in-house Slither + manual review is the floor, not a substitute for
  outside eyes on a contract that will hold real USDG (briefly) and
  mint real Morpho shares. A small canary deposit from a real wallet,
  after all of the above, is a valid final check -- not a substitute
  for any of the above.

## What's still NOT done

- **Not deployed anywhere yet** -- testnet or mainnet. Deploying is a
  separate, deliberate decision from writing/testing/reviewing the
  contract (see `scripts/deploy-cache-vault-deposit-direct.js`) --
  nothing points real value at it until that decision is made
  explicitly.
- **Frontend not wired.** No deposit UI, no live APY/TVL pulled from
  the vault for display -- marketplace card still says "IN DESIGN" for
  a reason.
- Real APY/TVL for that vault, to show honest live numbers on the
  frontend preview instead of a placeholder -- confirmed 3.91% net APY
  / $493.4M TVL on 2026-09-23 (see vault address section above), but
  that's a point-in-time check, not a live feed yet.
