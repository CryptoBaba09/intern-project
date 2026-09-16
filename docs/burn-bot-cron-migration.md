# Why the 20% BE distribution never actually worked — and the fix

Investigated 2026-09-16, triggered by deploying `InternRewardsRouter` and
needing `InternStakingRewards`'s owner key to call `setTargetAsset()`. What
started as "which wallet owns this" turned into three independent, real
reasons `notifyRewardAmount()` had never once succeeded in production.

## Finding 1: `InternStakingRewards`'s owner isn't the bot's wallet

`owner()` on the live contract (`0xd73a24D7bd311E36151344E233a7e6C73369E558`)
returns `0x163c267e80f02e849fe2982affcfe0810347a3bf`. The bot's configured
wallet, in both `contracts/.env` and `intern-burn-bot/.env`, is
`0xBF2670493E35A015505dC5DdA82dF2Ff8D4FCEFC` — a different address. Every
real `notifyRewardAmount()` call the bot ever attempted would have reverted
with `OwnableUnauthorizedAccount`, silently (failed calls emit no logs).

Confirmed via `eth_getLogs` against both `RewardAdded` and `RewardParked`
(the only two events `notifyRewardAmount()` can emit on success): **zero
of either, all-time.** `periodFinish` and `rewardRate` both read `0`. Real
$INTERN is staked (`totalStaked()` is nonzero) — this isn't "nobody's
staked yet," it's "this has never fired."

## Finding 2: nothing ever kept the bot running

`intern-burn-bot/index.js` schedules itself via `node-cron`'s
`cron.schedule()` — which only keeps firing while that exact node process
stays alive forever. There's no `vercel.json`, no systemd unit, no PM2
config, nothing anywhere in this repo that runs it as a persistent
process. The most likely explanation for Finding 1's own evidence: it was
only ever run manually, briefly, during development.

**Fix:** ported the bot's `lib/` logic (unchanged) into
`intern-site/src/app/api/cron/burn-and-distribute/`, a Vercel Cron route on
infrastructure this project already deploys to, instead of standing up a
separate always-on server. See that route's own top comment.

## Finding 3: the bot's wallet was never the real fee recipient either

Even with Finding 1 fixed, there'd be nothing to distribute:
`claimFees.js`'s own comments flag that Pons's `claim()` only ever pays the
caller's own escrow balance, never an arbitrary address. Decoded Pons
factory's `getLaunchedToken($INTERN)` directly on-chain:
`creatorFeeRecipient = 0x163c267e80f02e849fe2982affcfe0810347a3bf` — same
address as Finding 1, not the bot's wallet. So even a perfectly-configured,
always-running bot would claim exactly 0 ETH every cycle.

Verified the fix before suggesting it, via a real `eth_call` simulation
(no transaction sent): `transferCreatorFeeRecipient($INTERN,
0xBF2670...CEFC)`, called as if from `0x163...a3bf`, does not revert.

## The actual fix: run the bot as `0x163...a3bf`, not `0xBF2670...CEFC`

First pass at a fix (below, superseded) proposed three on-chain
`transferOwnership`/`transferCreatorFeeRecipient` calls to move
`0x163...a3bf`'s roles onto the bot's existing wallet. Better fix, decided
2026-09-16: run the bot **as** `0x163c267e80f02e849fe2982affcfe0810347a3bf`
directly. It's already the `creatorFeeRecipient`, already the owner of
`InternStakingRewards`, already the owner of `InternRewardsRouter` — every
permission check just passes, with **zero on-chain transactions needed**.

This also matches the original design intent, not just a workaround:
`distribute.js`'s own comment on `treasuryAddress` says it's *"deliberately
NOT the same wallet PRIVATE_KEY signs from (that's the creator wallet)"* —
i.e. the bot was always meant to run as the creator wallet, with treasury
(the 10% cut) going to `0xBF2670493E35A015505dC5DdA82dF2Ff8D4FCEFC`
separately. `intern-burn-bot/.env` simply had the wrong key in it.

**What this means concretely:**
- `BOT_PRIVATE_KEY` (Vercel, server-only) = `0x163...a3bf`'s private key,
  not `0xBF2670...CEFC`'s.
- `TREASURY_ADDRESS` stays `0xBF2670493E35A015505dC5DdA82dF2Ff8D4FCEFC` —
  already the default in `lib/config.js`, no change needed.
- `setTargetAsset()` on `InternRewardsRouter` is called directly by
  `0x163...a3bf` (already the owner) — no ownership transfer first.
- No `transferOwnership` or `transferCreatorFeeRecipient` calls at all.

~~Superseded: the three signatures below~~ — kept for the record, not the
plan:

1. ~~`InternStakingRewards.transferOwnership(0xBF2670...CEFC)`~~
2. ~~`InternRewardsRouter.transferOwnership(0xBF2670...CEFC)`~~
3. ~~Pons factory: `transferCreatorFeeRecipient($INTERN, 0xBF2670...CEFC)`~~

## Deploying the Cron route for real

1. Set `BOT_PRIVATE_KEY` in Vercel's env vars (server-only — never
   `NEXT_PUBLIC_`) to `0x163...a3bf`'s private key — **not** the key
   currently in `intern-burn-bot/.env`, which is the wrong wallet.
2. Set `CRON_SECRET` in Vercel's env vars to a random value — the route
   checks `Authorization: Bearer <CRON_SECRET>` on every request, which is
   what stops anyone else from hitting the public URL and triggering a
   real cycle. Vercel's own Cron Jobs send this header automatically once
   the env var exists.
3. Set `DRY_RUN=false` once ready to go live — defaults to `true` (fails
   safe) same as the standalone bot. Worth one manual dry-run cycle first
   to confirm the logs look sane before flipping it.
4. Do **not** run `intern-burn-bot` (`npm start`) at the same time as this
   route once it's live — see that project's own README.
5. Double check Vercel's actual Cron frequency limits for this project's
   plan tier before trusting `vercel.json`'s `0 * * * *` (hourly) --
   adjust the schedule there if the plan caps it lower.
