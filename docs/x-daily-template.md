# X daily posting template (3 posts a day)

Companion to [growth-plan.md](growth-plan.md). Three posts a day, each with one
job, so the feed never feels repeated. All numbers come from the refresh
scripts, never from memory.

| Slot | Job | Image |
|---|---|---|
| Morning | Graduation progress (the public goal) | `branding/x-card-graduation.png` |
| Midday | Contest or utility (rotates by weekday) | contest card, intern video, or utility card |
| Evening | Proof: what got burned | `branding/x-card-burn-24h.png` |

## Refresh the numbers first

```bash
node branding/graduation-card.js
node branding/burn-card.js
node branding/contest-card.js
node branding/news-wire.js   # after editing branding/news-wire.json
```

## 1. Morning: graduation update

```
$INTERN graduation: {PCT}% ({RAISED} of 4.2 ETH). {HOOK}

{LINE}

Next milestone: {NEXT}%. Buy $10+ or stake to help, and enter the contest.
```

{HOOK}, pick one per day:
- `Day {N} of the climb.`
- `Up {DELTA} ETH since yesterday.` (only when it is up)
- `{TO_GO} ETH to go.`

{LINE}, pick one per day:
- `Then: a Uniswap v4 pool with liquidity locked forever.`
- `Every buy on the curve counts, and it's all on-chain.`
- `Milestones: 10%, 25%, 50%, 100%. We post each one with proof.`

Milestone day, use instead:
`MILESTONE: {M}% reached. {RAISED} ETH raised. On-chain proof: [tx]. Next: {NEXT}%.`

## 2. Midday: rotating slot

| Day | Post | Template |
|---|---|---|
| Mon | Contest so far | `Competition #2 leaderboard. Pool: ${POOL}. {N} wallets on the board. Buy $10+, stake or trade $200, tag @InternburnHQ. Ends Oct 3, 12:00 UTC.` |
| Tue | Intern spotlight | `Intern #{N}: {NAME}. Job: {JOB}. {HOLDER_PAYBACK}. Reply "IN" to enter the contest.` |
| Wed | News wire | Fresh tokenization wire card with the "where do you USE a tokenized stock?" bridge |
| Thu | Utility post | `Six things you can do on internburn.xyz today.` (utility card) |
| Fri | Flywheel | `Every intern feeds holders.` (flywheel card) |
| Sat | Reply-bait | A hot take, or "which intern would you hire?" |
| Sun | Weekly recap | `This week: {BURNED} burned, {PCT}% to graduation, {N} entrants. Next week: {GOAL}.` |

## 3. Evening: proof post

```
{BURNED_24H} $INTERN burned in the last 24 hours.

Total burned: {TOTAL}. That's {PCT_SUPPLY}% of supply, gone for good.

Every trade fee: 70% buys back and burns. No vote. No button.
```

Variants, pick one per day:
- `Burn log: {N} burns today.` (when several happened)
- `Quiet day on the burn? Volume drives it. Every trade feeds Blaze.` (if it is low, stay honest)

## Rules for every post

- Numbers only from the scripts. Never type them by hand.
- No link in the main post. Put `internburn.xyz` and the contract
  (0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8) in the first reply.
- Press Escape after each `$` ticker and delete any link-preview card.
- Add a non-affiliation line whenever a real company is named. Never @-mention
  real companies, exchanges or the SEC in our own posts.
- No price promises. Put "Not financial advice" in the first reply once a day.
- Reply to comments within the first hour.
