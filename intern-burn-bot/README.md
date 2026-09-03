# $INTERN Burn Bot

Claims $INTERN's accumulated creator fees (paid in BE) from PAIR and splits
every claim three ways — automated, on a schedule, with every transaction
hash logged as public proof:

| Bucket | Default | What happens to it |
| --- | --- | --- |
| Burn | 70% | Swapped for $INTERN on the open market, then sent to the dead address |
| Distribution | 20% | Deposited into the `InternStakingRewards` contract (see `../contracts`) via `notifyRewardAmount()`, which streams it to everyone staking $INTERN, pro-rata and time-weighted |
| Treasury | 10% | Sent in BE to `TREASURY_ADDRESS` for ops/marketing/expansion |

Percentages are configurable via `BURN_PERCENT` / `DISTRIBUTION_PERCENT` /
`TREASURY_PERCENT` and must sum to 100 (the bot refuses to start otherwise).

## What's real vs. placeholder right now

- **Everything is now wired against PAIR's actual, verified contracts** —
  `lib/claimFees.js`, `lib/swap.js`, and `lib/pairContracts.js` all use ABIs
  confirmed against PAIR's docs (https://pair.fund/docs) and each
  contract's verified source on Blockscout, not guesses. Specifically:
  - Claiming is the real two-step flow (`PairV4Locker.collectFees(tokenId)`
    then `.claim(asset)`), and correctly claims **both** BE and $INTERN —
    a pool's fees land in whichever asset was traded, not just the quote
    asset.
  - Swapping goes through `PairV5MultiPoolAggregator` (PAIR's own
    integrator-facing swap contract), not hand-rolled Uniswap V4 Universal
    Router calldata — PAIR's docs explicitly warn the Robinhood-deployed
    router uses a non-standard struct field that's easy to get wrong.
  - **Slippage protection is real now** — `lib/swap.js` gets an actual
    pre-trade quote from `V4Quoter` and applies `MAX_SLIPPAGE_PERCENT` to
    it, replacing what used to be a hardcoded `amountOutMinimum = 0`.
  - `BE_TOKEN_ADDRESS`, `FEE_CLAIM_CONTRACT_ADDRESS`, `ROUTER_ADDRESS`,
    `LAUNCHPAD_ADDRESS`, and `QUOTER_ADDRESS` all default to real PAIR
    protocol addresses (`lib/config.js`) — they're protocol-wide, not
    per-token, so they don't need $INTERN to exist yet. Only
    `INTERN_TOKEN_ADDRESS` is genuinely unknowable before launch.
  - Pool-specific details (position id, fee tier, tick spacing, hook) are
    read live from PAIR's launchpad contract at runtime
    (`lib/pairContracts.js`) rather than hardcoded per launch.
  - One real unknown flagged in code: `PairV4Locker.claimable()`'s exact
    parameter order isn't confirmed from a named ABI signature (Blockscout
    returns it unnamed) — see the comment in `claimFees.js` for how to
    verify it once real balances exist.
- **Burn logic (`lib/burn.js`) and the fee split (`lib/distribute.js`) are
  fully real** — standard ERC20 transfers. Work today, no changes needed.
- **Holder distributions are now a real, working payout mechanism** —
  `../contracts/contracts/InternStakingRewards.sol`. Holders stake $INTERN
  into it and earn a pro-rata, time-weighted share of every BE deposit this
  bot makes; no indexer or off-chain holder list needed, since the contract
  itself tracks staker balances. It's unit-tested (`../contracts/test`,
  21 tests, including a specific test proving resistance to "stake right
  before a deposit, exit right after" reward sniping) but has **not** had a
  professional security audit — do not point real value at
  `DISTRIBUTOR_ADDRESS` until it has.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env`
3. Fill in `PRIVATE_KEY` with the wallet that launched $INTERN on PAIR —
   it's the only wallet that can claim creator fees, so it has to run this
   bot. Treat this like a bank password.
4. Leave `INTERN_TOKEN_ADDRESS` blank until $INTERN is actually live on
   PAIR — the bot detects this and warns instead of running against a
   garbage address. `BE_TOKEN_ADDRESS`, `FEE_CLAIM_CONTRACT_ADDRESS`,
   `ROUTER_ADDRESS`, `LAUNCHPAD_ADDRESS`, and `QUOTER_ADDRESS` already
   default to real PAIR protocol addresses — you don't need to fill those
   in unless PAIR ships a new version.
5. Keep `DRY_RUN=true` while testing. It logs every step without sending
   real transactions.

## Local test

```
npm install
node index.js
```

With addresses blank, you'll see a warning and the wallet will connect,
proving the code path works. Once addresses are filled in and DRY_RUN is
true, it'll log exactly what it *would* do without spending anything.

## Deploying to Railway

1. Push this folder to a GitHub repo (or a subfolder of your existing
   $INTERN repo)
2. In Railway: **New Project → Deploy from GitHub repo** → select it
3. Railway auto-detects Node.js. Set the start command if it doesn't
   pick up `node index.js` automatically (Settings → Deploy → Start Command)
4. Add all the `.env` variables under **Variables** in the Railway project
   — never commit the real `.env` file to git. Add a `.gitignore` with
   `.env` in it before you push (see below).
5. Deploy. Railway keeps it running continuously and restarts it if it
   ever does crash — though the unhandled-rejection fix in `index.js`
   means routine RPC hiccups won't cause that anymore.

## Before flipping DRY_RUN to false

- [ ] Real `INTERN_TOKEN_ADDRESS` filled in from the actual live PAIR launch
- [ ] `TREASURY_ADDRESS` set to a real, carefully-controlled wallet
  (ideally a multisig) — not the same wallet as `PRIVATE_KEY`'s
- [ ] `InternStakingRewards` deployed (see `../contracts`) and its address
  set as `DISTRIBUTOR_ADDRESS` — and reviewed by someone beyond this
  repo's own tests before real value flows through it
- [ ] `BURN_PERCENT` + `DISTRIBUTION_PERCENT` + `TREASURY_PERCENT` sum to
  100 and match what the website says
- [ ] `PairV4Locker.claimable()`'s parameter order verified against a real
  claimable balance (see the comment in `claimFees.js`)
- [ ] Wallet funded with a small amount of native ETH for gas
- [ ] Tested one full cycle manually with a tiny amount before trusting
  the schedule
- [ ] `.env` is in `.gitignore` and was never committed

## .gitignore

Create one in this folder with at least:
```
node_modules/
.env
```
