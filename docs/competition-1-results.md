# $INTERN Trading Competition #1 — results and analysis

Window: 2026-09-18 00:00 UTC to 2026-09-25 23:59:59 UTC (Robinhood Chain
blocks 65,779,486 to 72,639,301). Published rule: top 3 net-buyers, $20
minimum net-buy volume, prizes $50 / $30 / $20 in a tokenized stock of the
winner's choice. Analysis run 2026-09-26 from on-chain data only.

## Final winners (fair-play rules)

| Place | Wallet | Net buy | ≈ USD | Prize |
|---|---|---|---|---|
| 1 | `0x2017ab919fc04cd767af63d3e6e746c73a8f3ad1` | 0.0120 ETH | $32.2 | $50 in stock |
| 2 | `0xd1c167e2d91f759fb2125aa4a827d4e21c0eb99c` | 0.0090 ETH | $24.2 | $30 in stock |
| 3 | no qualifying wallet | — | — | $20 carries into Competition #2 |

USD at ETH = $2,687.17 (CoinGecko, 2026-09-26). Ranking is decided in ETH; USD
is only used for the $20 minimum (≈ 0.00744 ETH).

Both winners bought straight from the launch curve. Neither wallet sent or
received a single $INTERN transfer to or from any other wallet in the window,
and neither sold.

- `0x2017…3ad1`: one buy of 0.012 ETH on Sep 25 01:52 UTC
  (`0xb8390e1ea695f3a88bff51d5d8f606b73a0028091154b104965296d7105120c8`),
  still holding all 6,339,544 tokens. A long-standing wallet with weeks of
  normal on-chain activity.
- `0xd1c1…9c`: three buys on Sep 18 between 10:37 and 10:42 UTC
  (`0x8fad6b3e…`, `0x3e7afb44…`, `0x2841af6c…`), still holding.

## Fair-play rules applied

A wallet only ranks if all of these hold:

1. Net buy of at least $20 over the window (buys minus sells).
2. Independent: no $INTERN moved to or from any other wallet, so tokens come
   from the curve and stay in the wallet (or are staked).
3. No round trip: not flat after buying and selling.
4. Not a team or bot wallet.

Wallets that route tokens between each other are treated as one entrant.

## Wallets that did not qualify, and why

| Wallet | Net buy | Reason |
|---|---|---|
| `0x6aa80dbbed9ae5ab45fbf61f9644fada3b29326e` | 0.0439 ETH ($118) | Forwarded all 21.96M tokens to other wallets: `0x8c7aaa…29f1`, `0xd82cd3…237e`, `0x72544b…083f`, `0xea936f…b3ed`, and contract `0x1e5647…`. Fails rule 2. |
| `0x8f10b468b06c6fd214b65f87778827f7d113f996` | 0.0140 ETH ($37.5) | Forwarded 7.4M tokens to the same contract `0x1e5647…` that #1 used. Fails rule 2, and is linked to `0x6aa8…`. |
| `0x968999…8341` | 0.0083 ETH ($22.3) | Bought 0.297 ETH and sold 0.289 ETH the same evening, moving 130M tokens (13% of supply) through four helper wallets. Fails rules 2 and 3. |
| `0x431152071c0dde5c5e51b035d368ef0d0127d319` | ≈ $2 | Bought 0.02 ETH, handed the whole bag to `0x9b0559…4624`, which sold it back (tx `0x1dfed2bd…`). Below the minimum. |
| `0xe492…` | $4.6 | Round trip, below the minimum. |
| `0x09ad…` | $6.3 | Below the minimum and a bot-linked wallet. |

None of this proves who controls which wallet. It shows wallets acting as one
group. The two highest raw net-buyers (`0x6aa8…`, `0x8f10…`) can still claim by
signing a message from each wallet and showing they are independent. If they
cannot, the result above stands.

## Economics of Competition #1

- Gross curve volume in the window: 0.816 ETH (≈ $2,192), 31 buys, 11 sells.
- 84% of it came from two wallets that finished flat.
- Trading fees on the curve are 2% of volume (1% base fee + 1% creator tax).
  On-chain, the creator wallet is credited 85% of that, about 1.72% of volume
  (the other 15% goes to the protocol). Creator income in the window ≈ 0.0140
  ETH ≈ $37.7, against $80 of prizes actually awarded. Net ≈ -$42.
  Competition #2 ties the pool to fees actually earned (see
  competition-2-rules.md).

## Note on rule wording

The banner said only "top 3 net-buyers, $20 minimum". The fair-play rules above
were not spelled out. They are now written into Competition #2, and the
announcement of these results should state them plainly.
