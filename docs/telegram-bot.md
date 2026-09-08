# $INTERN Community bot (@InternCrew_bot)

Webhook-based Telegram bot, same serverless model as Rendo -- no
persistent process, Telegram calls our API route directly.

## What it does

- `/crew`, `/burn` (live, read from chain), `/price` (live, from PAIR), `/meme`
- Replies in-character (Blaze, Rendo, or Promptly, picked at random) when
  mentioned or replied to
- Occasionally drops a meme GIF or a quirky one-liner on-topic messages
  (burn/stake/trade/credits keywords), cooldown-limited per chat so it
  doesn't spam
- Welcomes new members with a persona GIF

Code: `intern-site/src/app/api/telegram/webhook/route.js` and
`intern-site/src/app/lib/telegramPersonas.js`. GIF assets served from
`intern-site/public/bot-assets/`.

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
