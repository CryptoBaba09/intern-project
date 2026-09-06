# $INTERN Genesis NFTs — feature spec (v0, not built yet)

Idea: once $INTERN hits a real trading-volume milestone, mint 500 unique
"Genesis Intern" NFTs — Blaze's mascot design, trait-varied — that stream
BE while staked and get scarcer (and more valuable to whoever's left
holding) every time one is burned.

## The trigger: earned, not day-one

Minting opens only after $INTERN crosses a real, on-chain milestone —
e.g. $1,000,000 in cumulative PAIR pool volume. This is the right call for
reasons beyond hype-building:

- It's the opposite of the classic NFT-collection-before-the-token-proves-
  anything pattern that reads as a cash grab. Gating the drop behind real
  trading activity says "we only did this because it was earned."
- It gives a concrete, trackable countdown to tease publicly — a
  volume ticker counting toward 500 Genesis Interns is a genuinely good
  piece of content for the socials calendar, not just an announcement.
- Tracking cumulative volume needs a small indexer reading `Swap` events
  off the PAIR pool (or the `PairV5MultiPoolAggregator`'s own events) —
  a narrower, well-scoped version of the same "watch on-chain events"
  pattern `intern-burn-bot` already does for fee claims.

## The mechanic

| Action | What happens |
|---|---|
| **Mint** | Burn a fixed $INTERN amount (proposed: 25,000 — 2.5x Forge's deploy fee, since this is scarcer and higher-status) to mint one Genesis Intern. 500 max, ever. |
| **Stake** | Deposit the NFT into a dedicated staking contract. While staked, it streams a pro-rata share of a BE reward pool — same Synthetix-style linear streaming already proven in `InternStakingRewards`, adapted for ERC-721 (one NFT = one unit of weight, instead of a token amount). |
| **Burn** | Permanently destroys the NFT and pays out whatever it has accrued so far. Total supply drops by one — and because the reward pool is split pro-rata across *currently staked* NFTs, everyone else's share goes up. |

That last row is the actual idea worth being excited about: **burning a
Genesis Intern doesn't just cash one holder out, it makes every remaining
one worth more.** It's the exact same "supply only ever goes down, and
that's the point" logic already running through $INTERN itself, just
applied one layer up. A holder now has a real decision to make — keep
staking for a shrinking-denominator, growing share, or burn and take a
sure thing — and that decision is genuinely interesting, not just a
claim button.

## Funding source

Recommendation: **treasury-funded, like the loyalty-rewards and
inference-credit specs**, not a cut of the core 70/20/10 split. Two
options on where the treasury BE actually comes from, worth deciding
explicitly rather than defaulting into one:

1. **Mint fees are burned** (matches Blaze/Forge — every real fee in this
   project burns $INTERN). The Genesis reward pool is then funded
   separately, on a cadence, from the treasury's discretionary BE —
   consistent with every other "extra yield layer" in this project, but
   it means the NFT tier's rewards depend on ongoing treasury decisions
   rather than being self-sustaining.
2. **Mint fees convert to BE instead of burning**, becoming the reward
   pool directly — self-funding and directly ties "more Genesis Interns
   minted" to "bigger reward pool," but breaks the "every fee burns"
   pattern used everywhere else, which matters for a brand built almost
   entirely on that promise.

Leaning toward (1) for brand consistency, but this is a real trade-off
worth deciding deliberately, not by default.

## Real risks and open questions

- **This is higher regulatory exposure than plain token staking, not
  the same.** An NFT explicitly marketed as generating "passive income"
  is squarely in territory regulators have specifically looked at before
  — "yield-bearing NFT" is its own scrutinized category, not just BE
  staking with extra steps. The Howey-adjacent flag already raised for
  BE staking applies here at least as strongly, arguably more, because
  the marketing language (passive income, rewards for holding) is
  exactly the kind of language that framing invites. Get real legal
  input specifically on this feature before promising "passive income"
  publicly anywhere.
- **A second, materially more complex contract.** ERC-721 mint/stake/
  burn logic with per-token reward accounting is a bigger surface than
  `InternStakingRewards` — enumerable per-token state, mint-price
  handling, and burn-triggered payout logic are all new code, not a
  reused pattern with a new coat of paint. It needs its own full test
  suite and its own audit; "the streaming math is copied from a proven
  contract" only covers one slice of the real surface.
- **Fair-mint design isn't solved by this spec.** 500 fixed-supply NFTs
  minting the moment a milestone hits will attract bots/snipers if it's
  just "first 500 transactions." Worth deciding upfront: an allowlist
  for existing long-term stakers, a small delay/commit-reveal, or
  accepting sniping as a cost of a simple design — but decide it on
  purpose, not by accident.
- **Volume-tracking indexer is new infrastructure.** Small in scope, but
  real — it's a new always-on service (like the burn bot) with its own
  uptime and correctness requirements, not a one-line addition.

## Suggested sequencing

This is naturally a **post-launch** feature — it's gated on $INTERN
already trading and hitting real volume, so building it now would mean
shipping a countdown to zero. Sequence:

1. Launch $INTERN, get core BE staking live and audited (already the
   near-term priority).
2. Build the volume-tracking indexer and start the public countdown —
   this alone is good content well before the contract itself needs to
   exist.
3. Get real legal input on the "passive income" framing specifically,
   given the heightened scrutiny yield-bearing NFTs attract.
4. Build `InternGenesisStaking` (or similar) with its own full test
   suite, decide the fair-mint mechanism, and get it independently
   audited before any real $INTERN gets burned minting one.
