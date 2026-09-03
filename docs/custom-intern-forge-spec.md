# $INTERN Custom Intern Builds ("Forge") — feature spec (v0, not built yet)

Idea: let anyone launch their own custom $INTERN-powered agent — payments,
writing, automations, or anything else they spec — instead of being
limited to the fixed roster (Blaze, Rendo, Promptly, Perky, Div). A
one-time $INTERN fee forges it; a minimum staked balance keeps it running.

## Why this is a different shape of feature than the rest of the roster

Every other marketplace entry is **one shared thing** the whole
$INTERN community collectively owns a piece of (Blaze is one burn
engine; Rendo/Promptly/Perky are one pooled reward stream each). Forge
is the first **per-user, individually-owned** thing in the marketplace —
each build is its own instance, with its own owner, its own fee event,
and its own ongoing stake requirement. That difference is exactly why it
needs the fee-and-stake mechanic that Blaze's card mistakenly claimed
for itself in an earlier draft: a discrete "deploy" action only makes
sense for something that gets created per-user, not for shared
infrastructure that just runs.

## Proposed mechanic

| | Value | Direction |
|---|---|---|
| Deploy fee | 10,000 $INTERN, one-time | Burned |
| Minimum stake | 50,000 $INTERN | Locked in `InternStakingRewards` (same contract as core staking) |
| Stake check | Continuous, not one-time | Drop below 50,000 → build auto-pauses |

**Why continuous, not one-time:** a one-time check at deploy lets someone
stake 50,000 just long enough to pass, withdraw immediately after, and
keep a "paid for" custom intern running forever without ever
contributing to the pool other stakers are drawing BE from. Reusing
`InternStakingRewards`'s existing `balanceOf(address)` as the live
eligibility source (the same pattern the [loyalty-rewards
spec](./loyalty-rewards-spec.md) and [inference-credits
spec](./inference-credits-spec.md) both already use) means Forge adds no
new staking ledger — it just reads the one that already exists, on
every relevant check.

**What's still open:** the fixed 10,000/50,000 numbers cover only the
*deploy and hold* cost. They don't cover *running* cost. Writing and
automations that call an LLM or execute recurring actions have a real,
ongoing compute/inference bill that the deploy fee alone doesn't fund —
Promptly's model (burn an equivalent-dollar amount of $INTERN per unit
of real usage) is the more honest pattern to borrow here than a flat
one-time fee, once the specific build types are scoped. Treat 10k/50k as
the access gate, not the full economic model.

## Scope split: writing/automations vs. payments

The three example use cases in this spec are not the same risk class:

- **Writing** — the agent produces text/content. No custody, no
  execution authority over anything of value. Safe to build first.
- **Automations** — the agent takes actions on the user's behalf
  (posting, scheduling, calling APIs). Depends entirely on what it's
  automating; scope each automation type individually rather than
  approving "automations" as a blanket category.
- **Payments** — the agent needs some standing authority to move funds.
  This is a different category of risk than the other two combined, and
  should not ship in the same wave as them.

A payments-capable custom intern needs, at minimum, before it's
buildable at all:
1. **A non-custodial execution model** — a scoped session key or
   equivalent with an explicit spend cap and an explicit allow-list of
   destinations/actions, not a standing key with open authority.
2. **A hard ceiling enforced on-chain or by the signing infrastructure**,
   not just in application logic that a bug could bypass.
3. **A clear answer to "who is liable if it moves funds wrong"** before
   any user is allowed to fund one — this is the same custodial-risk
   question flagged in the [digital-intern-avatars
   spec](./digital-intern-avatars-spec.md) for HeyGen credentials, except
   here the thing being entrusted is money, not a video-generation quota.

**Recommendation:** ship writing and narrowly-scoped automations first.
Treat payments as its own separate spec once a specific, concrete
execution model exists — not as a checkbox on this feature's launch
list.

## Technical flow (writing/automations tier only)

1. **Wallet-connect + signature auth** on the site — a prerequisite this
   shares with every other not-yet-built marketplace feature (see the
   inference-credits and digital-avatars specs for the same gap).
2. **A backend + database** to hold each build's config (what it does,
   its prompt/template, its owner) and to run the continuous stake check
   against `InternStakingRewards`.
3. **The deploy transaction**: user calls a token `transfer` of 10,000
   $INTERN to the dead address (reusing the exact burn pattern
   `intern-burn-bot` already uses — no new contract required for the
   burn itself), then signs a message proving that transfer was theirs;
   the backend verifies both the on-chain burn and the signature before
   activating the build.
4. **The pause check**: a scheduled job (or a check on every request the
   build serves) reads the owner's current staked balance and disables
   the build the moment it's below 50,000, re-enabling automatically
   once they restake.
5. **The execution layer itself** (what actually writes the content or
   runs the automation) is unscoped in this v0 — likely an LLM call via
   the same OpenRouter relationship Promptly would need, but that's a
   dependency to confirm once Promptly's own provisioning relationship
   exists, not something to stand up twice independently.

## Real risks and open questions

- **This is the first feature where a bug lets someone else's asset run
  on $INTERN's infrastructure with $INTERN's branding.** Content
  moderation, abuse, and "what happens if a build does something
  reputationally bad" need an actual policy before this is public, not
  just a fee gate.
- **Stake-based access control needs the same time-weighting scrutiny**
  as every other feature reading `InternStakingRewards` — a snapshot
  check that isn't resistant to flash-staking around the check interval
  recreates a version of the JIT-sniping problem already fixed once for
  BE rewards.
- **The 10,000/50,000 numbers are unvalidated** — they're directionally
  reasonable (10k matches the number already associated with "the"
  marketplace deploy fee in people's heads; 50k as 5x that is a
  meaningful-but-not-prohibitive commitment) but haven't been modeled
  against real $INTERN price or real demand.
- **Payments capability is explicitly out of scope for v0**, per above —
  don't let launch pressure fold it back in without the execution-model
  work being done first.

## Suggested sequencing

1. Ship writing/narrowly-scoped-automations only; keep payments
   entirely out of the first version's marketing and UI.
2. Build on top of core `InternStakingRewards` only once it's live,
   audited, and holding real staked value — same dependency every other
   spec in this project has already flagged.
3. Confirm the OpenRouter (or equivalent) execution-layer relationship
   through Promptly first if both features end up sharing it, rather
   than building two separate LLM integrations in parallel.
4. Write the abuse/moderation policy before opening builds to the
   public, not after the first incident.
