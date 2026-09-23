# $INTERN Community bot (@InternCrew_bot)

Webhook-based Telegram bot, same serverless model as Rendo -- no
persistent process, Telegram calls our API route directly.

## What it does

- `/crew`, `/burn` (live, read from chain), `/price` (live, from Pons --
  fixed 2026-09-22, was silently dead since the Pair.fund migration),
  `/meme`
- `/trivia` and `/leaderboard` -- a real, persisted-score mini-game
  (added 2026-09-22 to replace the third-party "ChatFight" bot the
  group had been running: same "first right answer wins" shape, but
  grounded in real $INTERN facts, with an on-brand promotion ladder
  instead of a bare score number -- Unpaid Intern -> Intern -> Senior
  Intern -> Team Lead -> Burn Master, see `RANK_TIERS` in
  `lib/telegramGame.js` -- and a leaderboard that survives a cold
  start, stored in Mongo).
- **A fresh trivia round now also fires automatically every 3 hours**
  (added 2026-09-23), not only when someone types `/trivia` -- see
  "Ambient trivia ticker" below. Keeps the group active between
  organic conversation instead of going quiet.
- Spam/scam moderation (added 2026-09-22, **escalated to real removal
  2026-09-23** to replace the third-party "Safeguard" bot) -- deletes
  (or, if the bot isn't a group admin, flags) messages matching common
  scam patterns: fake invite links, "DM me to claim airdrop",
  guaranteed-returns bait, fake support-DM recovery scams. First two
  strikes in 24h get deleted + warned; the **3rd strike gets the user
  actually kicked** (ban + immediate unban -- removed, not permanently
  blacklisted). Heuristic, not exhaustive -- see `SPAM_PATTERNS` in the
  route file to extend it. Never applied to chat admins/creators.
- Replies in-character (Blaze, Rendo, Promptly, Synapse, or Hush,
  picked at random) when mentioned or replied to
- Occasionally drops a meme GIF/photo or a quirky one-liner on-topic
  messages (burn/stake/trade/credits keywords), cooldown-limited per
  chat so it doesn't spam
- Welcomes new members with a persona GIF/photo

Code: `intern-site/src/app/api/telegram/webhook/route.js`,
`intern-site/src/app/lib/telegramPersonas.js`, and
`intern-site/src/app/lib/telegramGame.js`. GIF assets served from
`intern-site/public/bot-assets/`; Synapse/Hush (no GIF yet) use their
static icon from `intern-site/public/personas/` instead.

**Moderation needs the bot promoted to group admin** with "Delete
messages" AND "Ban users" permission to actually remove spam and kick
repeat offenders -- without these, the bot falls back to posting a
warning in-chat instead (still useful, just not silent, and can't
remove anyone). Do this in Telegram: group settings -> Administrators
-> add @InternCrew_bot -> enable both permissions.

## Ambient trivia ticker (new, 2026-09-23)

`api/telegram/auto-trivia/route.js` posts a fresh trivia question into
the group on its own, called every 3 hours by
`.github/workflows/telegram-game-ticker.yml` (GitHub Actions, not
Vercel Cron -- same Hobby-plan once/day cap reasoning as the X growth
bot). It writes to the same Mongo-backed active-question state the
webhook route reads, so an auto-posted question can be answered by
anyone in chat exactly like a manually-triggered `/trivia` round.

Setup:
1. In Vercel -> Environment Variables, add `TELEGRAM_AUTOTRIVIA_SECRET`
   = a new random string (separate from the webhook and announce
   secrets -- same "one secret per direction" pattern). Redeploy.
2. In GitHub repo Settings -> Secrets and variables -> Actions, add
   `TELEGRAM_AUTOTRIVIA_SECRET` with the same value.
3. That's it -- the workflow fires on its own from then on. Trigger a
   round manually any time from the Actions tab (`workflow_dispatch`)
   to test it.

## One-time setup (after this deploys)

1. In Vercel project settings -> Environment Variables, add:
   - `TELEGRAM_BOT_TOKEN` = the token BotFather gave for @InternCrew_bot
   - `TELEGRAM_WEBHOOK_SECRET` = any random string you generate (used to
     verify incoming requests are really from Telegram)
   Redeploy after adding these.

2. Register the webhook (replace `<TOKEN>` and `<SECRET>` with the same
   values you just set in Vercel):

   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://internburn.xyz/api/telegram/webhook" \
     -d "secret_token=<SECRET>"
   ```

   Confirm it registered:

   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

3. Add @InternCrew_bot to the $INTERN Community group as a member (no
   admin rights needed -- privacy mode is already disabled via BotFather
   so it can read all group messages once it's a member).

## Notes

- Cooldown/anti-spam state is in-memory (resets on cold start) -- same
  soft-limit pattern as Rendo's daily usage tracker. Fine for one group at
  low-to-moderate volume.
- Uses the same `ANTHROPIC_API_KEY` already configured for Rendo.

## Sending announcements INTO the group (new, 2026-09-11)

Separate from the webhook above (which only replies to incoming
messages), `intern-site/src/app/api/telegram/announce/route.js` lets
something outside Telegram push a message into the community group --
e.g. mirroring an X post there with its link, for reach. It is a
manual-trigger endpoint, not an autonomous poster: nothing calls it on
a schedule, and it requires its own secret. Call it after an X post is
confirmed live, not before, same "don't announce before it's real"
discipline as everything else here.

Setup:
1. Find the group's chat id: send any message in the target group, then
   check Vercel's function logs for `api/telegram/webhook` -- it now
   logs `chat.id` on every incoming message specifically so this is easy
   to find without touching Telegram's raw API.
2. In Vercel -> Environment Variables, add:
   - `TELEGRAM_CHAT_ID` = the id you just found
   - `TELEGRAM_ANNOUNCE_SECRET` = a new random string (NOT the same value
     as `TELEGRAM_WEBHOOK_SECRET` -- that one verifies Telegram calling
     us, this one verifies us calling this route, a different direction)
   Redeploy after adding these.
3. Call it:

   ```bash
   curl -X POST "https://internburn.xyz/api/telegram/announce" \
     -H "content-type: application/json" \
     -H "x-announce-secret: <TELEGRAM_ANNOUNCE_SECRET>" \
     -d '{"text": "Your announcement text, with the X post link in it."}'
   ```

   To include a video/gif/photo, add `"mediaUrl"` (a public URL) and
   `"mediaType"` (`"photo"`, `"video"`, or `"animation"`) to the body.
