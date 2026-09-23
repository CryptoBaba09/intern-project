# $INTERN X growth bot

**Status: deferred, 2026-09-23.** Code is built and merged, but the X
API step is intentionally not set up yet (real ongoing cost, paused by
choice -- see docs/x-growth-bot.md's cost estimate). The scheduled
workflow (`.github/workflows/x-growth-bot.yml`) checks for
`X_BEARER_TOKEN` and skips cleanly (green check, not a failure) every
hour until it's set -- nothing runs, nothing is spent, no noisy
failures. To turn it on later, just work through "One-time setup"
below; no code changes needed.

Standalone Node service (`intern-x-bot/`), same "separate deployable"
pattern as `intern-burn-bot/`, run hourly by
`.github/workflows/x-growth-bot.yml` (GitHub Actions), not Vercel Cron
-- this project's Vercel account is on the Hobby plan, which caps cron
schedules at once/day (see the one existing entry in
`intern-site/vercel.json`), too coarse for hourly. GitHub Actions runs
it for free within the included minutes.

## What it does, every hour

1. Searches recent (7-day) X posts matching `SEARCH_QUERY` (default:
   crypto / AI-agent / web3 / defi keywords).
2. Ranks them by a weighted engagement score (retweets/quotes weighted
   highest, then replies, then likes) and takes the top `TARGET_COUNT`
   (default 10).
3. Skips any author this bot already replied to within
   `AUTHOR_COOLDOWN_HOURS` (default 24) -- so it doesn't look fixated
   on one account.
4. For each remaining target, generates one reply via Claude Haiku in
   the account's own voice (`lib/persona.js` -- sharp, dry, grounded in
   real $INTERN facts, mascots name-dropped for flavor rather than
   switching "who's talking" every reply).
5. Posts the reply directly to X (or, if `DRY_RUN=true`, just logs what
   it *would* have posted).
6. Logs every reply -- text, target, dry-run or not -- to MongoDB
   (`xGrowthBotLog` collection, same Atlas cluster as the rest of this
   project).

## Why fully autonomous, no per-post approval

Explicit product decision, not an oversight: you asked for a bot that
posts on its own, matching your account's voice, rather than a draft
queue. The trade-offs that decision carries, and how this build
compensates:

- **No human catches a bad reply before it's public.** Compensated by:
  a tight, grounded system prompt (it's told exactly what it's allowed
  to claim and to skip the $INTERN pivot entirely if a post doesn't
  call for it), a real Mongo audit log of every single reply so you can
  review/spot-check after the fact, and `DRY_RUN` defaulting to `true`
  so you see a full hour (or several) of real output before anything
  goes live.
- **Platform risk.** X's rules treat unsupervised automated
  engagement-for-promotion as something to watch for. This bot is
  scoped to stay well inside "an account replying like a person would"
  rather than "a bot farming reach": low volume (10/hour cap), varied
  targets (author cooldown), no engagement-bait phrasing, no forced
  self-promotion. Still genuinely worth periodically reading the log
  and the account's own analytics for any sign of reduced reach or a
  platform warning.

## One-time setup

1. **X Developer account** (developer.x.com) -- create a Project + App
   on the account that owns @Internburn_xyz, with OAuth 1.0a **Read and
   Write** permissions, then generate that App's API Key/Secret and
   Access Token/Secret (user context -- these post AS your account,
   treat them like a password). Also grab the App's Bearer Token
   (app-only, used for the read/search step).

   Real cost, checked 2026-09-22 (verify current numbers at
   developer.x.com/en/products/x-api before relying on this): X moved
   to pay-per-use pricing in Feb 2026. Posting is ~$0.015/reply (or
   $0.20 if the reply contains a link), reading is ~$0.005/read. At the
   default 10 targets/hour with link-free replies, that's roughly
   $0.015 \* 10 \* 24 \* 30 ≈ **$108/month** in posting cost, plus
   search reads on top (~100 reads/hour ≈ 72k/month ≈ **$360/month** at
   $0.005 each) -- so budget somewhere in the few-hundred-dollars/month
   range, not the old flat $200/mo Basic tier.

2. **MongoDB** -- reuse the same `MONGODB_URI` already configured for
   `intern-site` (Vercel env vars), or a separate database if you'd
   rather keep this bot's data isolated. Either way it needs its own
   `intern.xGrowthBotLog` collection, created automatically on first
   write.

3. **Anthropic key** -- reuse the same `ANTHROPIC_API_KEY` already used
   by the Telegram bot / Rendo.

4. **GitHub repo secrets** (Settings -> Secrets and variables ->
   Actions) -- add `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`,
   `X_ACCESS_SECRET`, `X_BEARER_TOKEN`, `ANTHROPIC_API_KEY`,
   `MONGODB_URI`. Leave `X_BOT_DRY_RUN` unset (defaults to `true`) until
   you've reviewed real dry-run output in the Actions tab's logs.

5. **Test locally first**, real search + real generation, no posting:

   ```bash
   cd intern-x-bot
   npm install
   cp .env.example .env   # fill in the values above, leave DRY_RUN=true
   node index.js
   ```

6. **Go live**: add a `X_BOT_DRY_RUN` repo secret set to `false`. Every
   run after that posts for real. To stop it, either delete/disable the
   scheduled workflow in the Actions tab, or flip `X_BOT_DRY_RUN` back
   to `true` -- both work as an instant kill switch without touching
   code.

## Optional: Grok Imagine for media replies

Not wired up yet -- `XAI_API_KEY` is read by `lib/config.js` but
nothing currently calls the Grok Imagine API. Once you've confirmed a
real reference-to-video call against docs.x.ai behaves as documented
(feed it the mascot icons in `intern-site/public/personas/*-icon.png`
as reference images for character consistency), this is the natural
place to add an occasional media reply instead of text-only -- ask for
that as a follow-up once the text-only bot has a few clean days of
audit-log output to look at.

## Extending

- Tune `SPAM`-adjacent behavior via `lib/persona.js`'s system prompt.
- Tune targeting via `SEARCH_QUERY` / the scoring weights in
  `lib/targets.js`.
- All state lives in `xGrowthBotLog` -- query it directly in Mongo for
  a manual report of everything the bot has ever posted.
