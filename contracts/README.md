# $INTERN Contracts

Solidity contracts for $INTERN, built with [Hardhat](https://hardhat.org).
Currently one contract: `InternStakingRewards`.

## InternStakingRewards

Holders stake $INTERN here to earn a pro-rata share of BE deposited by
[`intern-burn-bot`](../intern-burn-bot) — the 20% "distribution" cut of
every claimed creator fee (see the burn bot's README for the full 70/20/10
split).

**Why staking, not a wallet-balance snapshot?** There's no `getAllHolders()`
on an ERC20 — knowing every wallet's balance to pay out pro-rata needs
either an off-chain indexer or periodic Merkle-tree airdrops, both real
infrastructure to build and run. Staking sidesteps that entirely: only
stakers are tracked, and the contract itself is the source of truth for
that (it's just contract storage) — no indexer, no off-chain holder list.
Staking is non-custodial and reversible any time; it is not a lockup.

**Why does the reward *stream* instead of paying out instantly?** An
earlier version credited each BE deposit as an instant lump sum, weighted
by whoever happened to be staked at that exact moment. A security review
caught that this makes "stake right before a deposit lands, withdraw right
after" a free way to snipe a share of the reward at existing stakers'
expense — the same "JIT" pattern behind real Uniswap v3 JIT-LP exploits.
The fix (used here) is the same one most of DeFi settled on: rewards
stream linearly over `rewardsDuration` (default 1 hour) using the standard
Synthetix `StakingRewards` accounting shape, so capturing a meaningful
share requires actually holding the stake over time, not just being
present for one transaction. See `test/InternStakingRewards.test.js`'s
"JIT reward-sniping resistance" test for a concrete before/after proof.

## Setup

```
npm install
npx hardhat compile
npx hardhat test
```

21 tests cover staking/withdrawing, single- and multi-staker reward
streaming, checkpointing across stake changes mid-stream, the
zero-stakers-yet edge case (`unallocatedRewards` / `sweepUnallocated`),
access control, and the JIT-sniping resistance case above.

## Deploying

```
INTERN_TOKEN_ADDRESS=0x... BE_TOKEN_ADDRESS=0x... OWNER_ADDRESS=0x... \
  npx hardhat run scripts/deploy.js --network <network>
```

- `OWNER_ADDRESS` should be the burn bot's wallet address (same one as
  `PRIVATE_KEY` in `intern-burn-bot/.env`) — it's the only address allowed
  to call `notifyRewardAmount`.
- To dry-run against real, already-deployed BE/$INTERN contracts without
  spending anything, fork Robinhood Chain locally instead of using a real
  network:
  ```
  npx hardhat node --fork https://rpc.mainnet.chain.robinhood.com
  # in another terminal:
  INTERN_TOKEN_ADDRESS=0x... BE_TOKEN_ADDRESS=0x... OWNER_ADDRESS=0x... \
    npx hardhat run scripts/deploy.js --network localhost
  ```
- After a real deployment, set `DISTRIBUTOR_ADDRESS` in
  `intern-burn-bot`'s environment (Railway variables in production) to the
  deployed address, and verify the contract's source on Blockscout so
  stakers can read it before trusting it with funds.

## Before real value touches this contract

- [ ] Deployed and the address verified on Blockscout
- [ ] Reviewed by someone experienced in Solidity security beyond this
  repo's own unit tests — this has NOT had a professional audit
- [ ] `rewardsDuration` (default 1 hour) reviewed against the burn bot's
  actual `RUN_INTERVAL_MINUTES` — they don't have to match exactly, but a
  `rewardsDuration` much shorter than the bot's claim interval re-opens
  more of a sniping window between deposits
- [ ] Ownership (`OWNER_ADDRESS`) is the burn bot's actual wallet, and that
  wallet's `PRIVATE_KEY` is stored only as a Railway secret, never in code
  or git
