# $INTERN Trading Competition #2 — rules, dates and break-even math

Live 2026-09-26.

## Dates (all UTC)

- Announce and start: Sat 2026-09-26 12:00
- Competition window: Sat 2026-09-26 12:00 to Sat 2026-10-03 12:00 (7 days)
- Results published: by Mon 2026-10-05
- Prizes paid: within 7 days of results, after wallet verification

## Rules

1. Post on X tagging @InternburnHQ, with the wallet you're competing from.
2. Net buy at least $10 of $INTERN during the window.
3. Qualify by EITHER staking at least $10 of $INTERN at close OR generating at
   least $200 of personal trading volume in the window.
4. Rank by net-buy over the window (buys minus sells), from on-chain data.
5. Fair play: your wallet must not send or receive $INTERN to or from other
   wallets during the window (tokens come from the curve and stay put or get
   staked). Wallets linked by shared token flows count as one entrant and get
   one prize. Team and bot wallets are excluded. Round trips do not rank.
   Breaking these means disqualification.
6. Prizes are paid in a tokenized stock of the winner's choice (TSLA, NVDA,
   SPCX or BE), valued in USD at the close of the window.
7. Results, addresses and method are published, as with Competition #1.

## The math (why we break even)

Measured on-chain over the whole life of the launch (1.534 ETH of volume):

- Trading fees are 2% of volume (1% base fee + 1% creator tax).
- The creator wallet is credited 85% of those fees, about **1.72% of volume**.
  The other 15% goes to the protocol. Credits and claims match exactly
  (0.0264 ETH credited, 0.0264 ETH claimed).
- **Prize pool = 1% of all window volume, plus a $20 starting bonus** (the
  unawarded 3rd place from Competition #1).
- So for every $100 traded: $1.72 comes in, $1.00 goes to the pool and $0.72
  stays for the normal 70/20/10 split (burn, stakers, treasury).

Break-even holds once window volume is at least $2,778 (where 0.72% of
volume covers the $20 bonus). Below that the most we can lose is the $20
bonus. Above it every prize is covered by fees and money is left over.

| Window volume | Creator income (1.72%) | Pool (1% + $20) | Places paid | Prizes | Left for burn/stakers/treasury |
|---|---|---|---|---|---|
| $1,000 | $17.20 | $30 | top 3 | $15 / $9 / $6 | -$12.80 (bonus subsidy) |
| $2,778 | $47.78 | $47.78 | top 3 | $23.89 / $14.33 / $9.56 | $0 (break-even) |
| $5,000 | $86 | $70 | top 3 | $35 / $21 / $14 | $16 |
| $10,000 | $172 | $120 | top 5 | $48 / $30 / $18 / $12 / $12 | $52 |
| $25,000 | $430 | $270 | top 5 | $108 / $67.50 / $40.50 / $27 / $27 | $160 |
| $50,000 | $860 | $520 | top 5 | $208 / $130 / $78 / $52 / $52 | $340 |

Places unlock with the pool so no prize is trivially small:
- Pool under $25: 1st only
- $25 to $99: top 3 split 50 / 30 / 20
- $100 or more: top 5 split 40 / 25 / 15 / 10 / 10

Extra protection: the personal-volume route to qualify ($200) pays us 1.72% of
it (about $3.44 per qualifier). ETH price moves are covered by the 42% margin
between income (1.72%) and the pool (1%).

For scale: Competition #1 had about $2,200 of volume, and 84% of it was two
wallets round-tripping.

## Notes

- The 70/20/10 split still runs on the leftover 0.72%, so the burn continues
  during the competition (about 0.50% of volume burned).
- Optional: a fixed team seed (e.g. $50) makes the day-one headline bigger but
  is not break-even below about $5,000 of volume. That is a marketing call.
