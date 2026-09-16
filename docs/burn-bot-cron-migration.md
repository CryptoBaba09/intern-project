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

## The three signatures that actually fix this

All three from `0x163c267e80f02e849fe2982affcfe0810347a3bf` (confirmed
2026-09-16 to be a wallet the team controls), transferring operational
control to `0xBF2670493E35A015505dC5DdA82dF2Ff8D4FCEFC` (the bot's wallet,
chosen over a fresh dedicated wallet for simplicity):

1. `InternStakingRewards.transferOwnership(0xBF2670...CEFC)`
2. `InternRewardsRouter.transferOwnership(0xBF2670...CEFC)` (needed for
   `setTargetAsset()`, unrelated to distribution but same root cause)
3. Pons factory: `transferCreatorFeeRecipient($INTERN, 0xBF2670...CEFC)`

## Deploying the Cron route for real

1. Set `BOT_PRIVATE_KEY` in Vercel's env vars (server-only — never
   `NEXT_PUBLIC_`) to the same key already in `intern-burn-bot/.env`.
2. Set `CRON_SECRET` in Vercel's env vars to a random value — the route
   checks `Authorization: Bearer <CRON_SECRET>` on every request, which is
   what stops anyone else from hitting the public URL and triggering a
   real cycle. Vercel's own Cron Jobs send this header automatically once
   the env var exists.
3. Set `DRY_RUN=false` once ready to go live — defaults to `true` (fails
   safe) same as the standalone bot.
4. Do **not** run `intern-burn-bot` (`npm start`) at the same time as this
   route once it's live — see that project's own README.
5. Double check Vercel's actual Cron frequency limits for this project's
   plan tier before trusting `vercel.json`'s `0 * * * *` (hourly) --
   adjust the schedule there if the plan caps it lower.
