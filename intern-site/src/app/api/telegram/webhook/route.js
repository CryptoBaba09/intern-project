import { createPublicClient, http, formatUnits } from "viem";
import { robinhoodChain, CONTRACTS, DEAD_ADDRESS } from "../../../lib/chain";
import { ERC20_ABI } from "../../../lib/abis";
import { PERSONAS, PERSONA_LIST, randomPersona, findTopicGif } from "../../../lib/telegramPersonas";
import { fetchInternPriceUsd } from "../../../lib/ponsPrice";
import {
  randomQuestion,
  isCorrectAnswer,
  recordWin,
  getLeaderboard,
  rankForScore,
  promotionOnWin,
  setActiveTrivia,
  getActiveTrivia,
  clearActiveTrivia,
} from "../../../lib/telegramGame";

// $INTERN Community Telegram bot (@InternCrew_bot). Webhook-based, same
// architecture as Rendo -- serverless, no persistent process. Telegram
// calls this route for every update once the webhook is registered (see
// docs/telegram-bot.md for the setWebhook command).
//
// Known, disclosed limitation: cooldown + welcomed-chat tracking below is
// an in-memory Map, same soft-limit pattern as Rendo's usage tracker
// (rendo/generate/route.js). It resets on cold start and isn't shared
// across concurrent serverless instances. Fine for a single low-traffic
// group; replace with a real store if this scales to many chats.
const lastOrganicReply = new Map(); // chatId -> timestamp (ms)
// Shortened from an earlier, sparser 90s/12%-chance version -- the bot was
// going quiet for most of a busy chat. Now every on-topic message gets a
// reply (gif or persona line), gated only by this cooldown so it doesn't
// reply to five burn messages in a row.
const ORGANIC_COOLDOWN_MS = 45_000;

// Active /trivia question state now lives in Mongo (lib/telegramGame.js),
// not an in-memory Map -- it has to be readable from a second, separate
// route (api/telegram/auto-trivia, triggered on a schedule by
// .github/workflows/telegram-game-ticker.yml so the group gets a
// question every few hours, not only when someone types /trivia) which
// is a different serverless function and can't see this one's memory.

// Replaces the third-party "Safeguard" moderation bot. Deliberately
// narrow and heuristic, not a full anti-scam system -- it catches the
// loud, common patterns (fake support DMs, fake airdrop-claim links,
// unsolicited profit-flex bait used to lure people into a scam DM)
// without trying to be exhaustive. False negatives are expected; tune
// this list from what actually shows up in the group.
const SPAM_PATTERNS = [
  /t\.me\/(joinchat|\+)[a-z0-9_-]+/i,
  /dm\s*(me)?\s*(for|to)\s*(claim|airdrop|whitelist|signal)/i,
  /guaranteed\s*(profit|returns|roi)/i,
  /wallet\s*(drain|connect).{0,20}(claim|verify|validate)/i,
  /(customer|live)\s*support.{0,20}(recover|refund|dm)/i,
  /free\s*(mint|airdrop).{0,30}(claim now|limited)/i,
];

function looksLikeSpam(text) {
  return SPAM_PATTERNS.some((re) => re.test(text));
}

// Escalating enforcement: 1st/2nd spam hit in a chat gets deleted (or
// flagged) and a warning; the 3rd within STRIKE_WINDOW_MS gets the user
// actually removed, not just warned forever -- "kick spam out" per the
// brief, not "endlessly delete their messages". In-memory (resets on
// cold start, same disclosed trade-off as the cooldown Maps elsewhere
// in this file) -- worst case a restart forgives someone's strikes,
// which is the safe direction to fail in for a moderation feature.
const spamStrikes = new Map(); // `${chatId}:${userId}` -> { count, firstAt }
const STRIKE_WINDOW_MS = 24 * 3600_000;
const STRIKE_LIMIT = 3;

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

const SITE_URL = "https://internburn.xyz";
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

function assetUrl(path) {
  return `${SITE_URL}${path}`;
}

async function tg(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[telegram] ${method} failed:`, res.status, await res.text());
  }
  return res;
}

function sendText(chatId, text, replyToMessageId) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    reply_to_message_id: replyToMessageId,
    allow_sending_without_reply: true,
    disable_web_page_preview: true,
  });
}

function sendAnimation(chatId, gifPath, caption, replyToMessageId) {
  return tg("sendAnimation", {
    chat_id: chatId,
    animation: assetUrl(gifPath),
    caption,
    reply_to_message_id: replyToMessageId,
    allow_sending_without_reply: true,
  });
}

function sendPhoto(chatId, photoPath, caption, replyToMessageId) {
  return tg("sendPhoto", {
    chat_id: chatId,
    photo: assetUrl(photoPath),
    caption,
    reply_to_message_id: replyToMessageId,
    allow_sending_without_reply: true,
  });
}

// Synapse and Hush only have a static icon (no GIF yet, see
// telegramPersonas.js) -- this is the one place that needs to know
// that and branch, so every call site below can just say "send this
// persona's media" without caring which field is set.
function sendPersonaMedia(chatId, persona, caption, replyToMessageId) {
  if (persona.gif) return sendAnimation(chatId, persona.gif, caption, replyToMessageId);
  return sendPhoto(chatId, persona.photo, caption, replyToMessageId);
}

// Moderation helpers -- replaces the third-party "Safeguard" bot. Only
// called when SPAM_PATTERNS already matched, so the extra
// getChatMember round-trip is rare, not on every message.
async function isChatAdmin(chatId, userId) {
  try {
    const res = await tg("getChatMember", { chat_id: chatId, user_id: userId });
    const data = await res.json();
    const status = data?.result?.status;
    return status === "creator" || status === "administrator";
  } catch (err) {
    console.error("[telegram] isChatAdmin error:", err);
    return false; // fail closed: an unknown status still gets moderated
  }
}

async function deleteMessage(chatId, messageId) {
  try {
    const res = await tg("deleteMessage", { chat_id: chatId, message_id: messageId });
    return res.ok;
  } catch (err) {
    console.error("[telegram] deleteMessage error:", err);
    return false;
  }
}

// banChatMember followed by an immediate unban is the standard Bot API
// pattern for a KICK (remove now, but don't permanently ban) rather
// than a permanent ban -- matches "kick spam out", not "permanently
// blacklist", since these are usually compromised/throwaway accounts
// posting the same link everywhere, not necessarily worth a permanent
// record. Needs the bot to have "Ban users" admin rights, same section
// as "Delete messages" -- see docs/telegram-bot.md.
async function kickUser(chatId, userId) {
  try {
    const banRes = await tg("banChatMember", { chat_id: chatId, user_id: userId });
    if (!banRes.ok) return false;
    await tg("unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true });
    return true;
  } catch (err) {
    console.error("[telegram] kickUser error:", err);
    return false;
  }
}

function recordStrike(chatId, userId) {
  const key = `${chatId}:${userId}`;
  const now = Date.now();
  const existing = spamStrikes.get(key);
  if (!existing || now - existing.firstAt >= STRIKE_WINDOW_MS) {
    spamStrikes.set(key, { count: 1, firstAt: now });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

// Returns true if this message was handled as spam (deleted/flagged,
// and possibly the user kicked), so the caller knows not to also run it
// through the normal passive-reply / trivia-answer logic.
async function moderateMessage(chatId, messageId, userId, username, text) {
  if (!looksLikeSpam(text)) return false;
  if (await isChatAdmin(chatId, userId)) return false; // never moderate admins/team

  const deleted = await deleteMessage(chatId, messageId);
  const strikeCount = recordStrike(chatId, userId);
  const who = username ? `@${username}` : "that user";

  if (strikeCount >= STRIKE_LIMIT) {
    const kicked = await kickUser(chatId, userId);
    spamStrikes.delete(`${chatId}:${userId}`);
    await sendText(
      chatId,
      kicked
        ? `🚫 ${who} removed after repeated scam-pattern messages.`
        : `⚠️ ${who} has hit ${strikeCount} scam-pattern strikes -- I can't remove them (need "Ban users" admin rights). Admins, please check.`
    );
  } else if (!deleted) {
    // Bot isn't a group admin (or lacks delete rights) -- can't remove
    // the message either, so at least warn the chat instead of
    // silently doing nothing.
    await sendText(chatId, `⚠️ ${who}'s message looks like a scam pattern (fake support/airdrop/DM bait) -- don't click anything in it. Strike ${strikeCount}/${STRIKE_LIMIT}.`);
  }
  return true;
}

async function generatePersonaLine(persona, triggerText, liveFactsLine) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const userContent = liveFactsLine
      ? `Chat message: "${triggerText.slice(0, 300)}"\n\nLive right now: ${liveFactsLine}`
      : `Chat message: "${triggerText.slice(0, 300)}"`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        system: persona.system,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) {
      console.error("[telegram] Anthropic error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error("[telegram] generatePersonaLine error:", err);
    return null;
  }
}

async function getLiveBurn() {
  if (!CONTRACTS.internToken) return null;
  try {
    const [balance, decimals] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.internToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [DEAD_ADDRESS],
      }),
      publicClient.readContract({
        address: CONTRACTS.internToken,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
    ]);
    return Number(formatUnits(balance, decimals));
  } catch (err) {
    console.error("[telegram] getLiveBurn error:", err);
    return null;
  }
}

// Fixed 2026-09-22 -- this used to hit pair.fund's dead API (broken
// since the 2026-09-10 Pons migration, always returned null). Now uses
// the same real, live Pons-curve price read that TradeView/Footer/
// promptly-price already use (lib/ponsPrice.js) instead of a second,
// separately-broken price source.
async function getLivePrice() {
  try {
    return await fetchInternPriceUsd();
  } catch (err) {
    console.error("[telegram] getLivePrice error:", err);
    return null;
  }
}

// Pulls real live numbers (burn total, price) so persona replies can cite
// them accurately instead of the model guessing or staying vague. Best
// effort -- either piece can come back null if the read fails, and the
// persona system prompt already says not to state a number it wasn't
// given, so a partial/empty line here just means a less specific reply.
async function getLiveFactsLine() {
  const [burned, price] = await Promise.all([getLiveBurn(), getLivePrice()]);
  const parts = [];
  if (burned !== null) parts.push(`${Math.round(burned).toLocaleString()} $INTERN burned so far (permanent, read from the dead address)`);
  if (price) parts.push(`price is $${Number(price).toFixed(8)}`);
  return parts.length ? parts.join("; ") + "." : null;
}

async function handleCommand(cmd, chatId, messageId) {
  switch (cmd) {
    case "/start":
    case "/help":
      return sendText(
        chatId,
        "I'm the $INTERN crew bot -- Blaze, Rendo, Promptly, Synapse & Hush, live in this chat.\n\n" +
          "/crew -- meet the interns\n" +
          "/burn -- live burned total, read from chain\n" +
          "/price -- live $INTERN price\n" +
          "/meme -- random $INTERN meme\n" +
          "/trivia -- quick $INTERN question, first right answer wins a point and climbs the ranks (Unpaid Intern -> Burn Master)\n" +
          "/leaderboard -- top scorers in this chat\n\n" +
          `More at ${SITE_URL}`,
        messageId
      );
    case "/crew":
      return sendText(
        chatId,
        PERSONA_LIST.map((p) => `${p.name} -- ${p.role}`).join("\n") + `\n\nFull crew: ${SITE_URL}/marketplace`,
        messageId
      );
    case "/burn": {
      const burned = await getLiveBurn();
      const text =
        burned !== null
          ? `${Math.round(burned).toLocaleString()} $INTERN burned, permanently. Read straight off the dead address, live.`
          : "Couldn't read the burn total right now -- try again in a bit.";
      // x-gif-burn-ticker.gif is deliberately not used here -- it's a
      // static asset with a specific count baked into the image, so it
      // goes stale the moment the real total moves. x-gif-blaze.gif has
      // no numbers in it; the real number only ever comes from the text
      // above, read live from the dead address on every call.
      return sendAnimation(chatId, "/bot-assets/x-gif-blaze.gif", text, messageId);
    }
    case "/price": {
      const price = await getLivePrice();
      const text = price ? `$INTERN is at $${Number(price).toFixed(8)} right now.` : "Couldn't fetch the live price right now -- try again shortly.";
      return sendText(chatId, text, messageId);
    }
    case "/meme": {
      const persona = randomPersona();
      return sendPersonaMedia(chatId, persona, `${persona.name}, reporting for duty.`, messageId);
    }
    case "/trivia": {
      const question = randomQuestion();
      await setActiveTrivia(chatId, question);
      return sendText(chatId, `🧠 Trivia: ${question.q}\n\nFirst correct answer in chat wins a point.`, messageId);
    }
    case "/leaderboard": {
      const rows = await getLeaderboard(chatId);
      if (!rows.length) return sendText(chatId, "No trivia scores yet in this chat -- try /trivia.", messageId);
      const lines = rows.map((r, i) => `${i + 1}. ${r.username} -- ${rankForScore(r.score).title} (${r.score})`);
      return sendText(chatId, `🏆 Intern leaderboard:\n\n${lines.join("\n")}`, messageId);
    }
    default:
      return null;
  }
}

export async function POST(req) {
  // Verify this call actually came from Telegram, not a scanner hitting a
  // public URL -- Telegram echoes back the secret token set in
  // setWebhook's secret_token param.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: "bot not configured" }, { status: 503 });
  }

  let update;
  try {
    update = await req.json();
  } catch {
    return Response.json({ ok: true }); // ignore malformed bodies, don't error to Telegram
  }

  const message = update.message;
  if (!message) return Response.json({ ok: true });

  const chatId = message.chat.id;
  const messageId = message.message_id;

  // One-line, low-noise log so TELEGRAM_CHAT_ID (needed by
  // api/telegram/announce/route.js -- see docs/telegram-bot.md) can be
  // found in Vercel's function logs just by sending any message in the
  // target group, rather than digging through Telegram's raw API.
  console.log(`[telegram] message from chat.id=${chatId} title="${message.chat.title || message.chat.type}"`);

  // Welcome new members with a random persona.
  if (Array.isArray(message.new_chat_members) && message.new_chat_members.length) {
    const persona = randomPersona();
    const names = message.new_chat_members
      .filter((m) => !m.is_bot)
      .map((m) => m.first_name)
      .join(", ");
    if (names) {
      await sendPersonaMedia(
        chatId,
        persona,
        `Welcome, ${names}. ${persona.name} here -- ${persona.role.toLowerCase()}. Say hi, or try /help.`
      );
    }
    return Response.json({ ok: true });
  }

  const text = message.text;
  if (!text) return Response.json({ ok: true });

  // Moderation gate, before anything else (including commands -- a
  // spam message dressed up as a fake command should still get caught).
  // Skipped for bots/anonymous-admin sends, same population the passive
  // reply logic already excludes below.
  if (!message.from?.is_bot && !message.sender_chat && message.from?.id) {
    const handled = await moderateMessage(chatId, messageId, message.from.id, message.from.username, text);
    if (handled) return Response.json({ ok: true });
  }

  if (text.startsWith("/")) {
    const cmd = text.split(/[\s@]/)[0].toLowerCase();
    await handleCommand(cmd, chatId, messageId);
    return Response.json({ ok: true });
  }

  const isMentioned = text.toLowerCase().includes("@interncrew_bot");
  const isReplyToBot = message.reply_to_message?.from?.is_bot && message.reply_to_message?.from?.username === "InternCrew_bot";

  if (isMentioned || isReplyToBot) {
    const persona = randomPersona();
    const liveFactsLine = await getLiveFactsLine();
    const line = await generatePersonaLine(persona, text, liveFactsLine);
    if (line) await sendText(chatId, line, messageId);
    return Response.json({ ok: true });
  }

  // Passive replies are meant to read as the bot noticing real community
  // conversation -- not as it reacting to the admin's own testing/admin
  // messages. A message posted anonymously as the group itself (owner or
  // another admin using "send anonymously") arrives with message.from set
  // to Telegram's GroupAnonymousBot pseudo-user (is_bot: true) rather than
  // a real member, and message.sender_chat set to the group. Skip passive
  // replies for both that case and any other bot's message; explicit
  // commands and @mentions still work for everyone, admin included --
  // this only holds back the "we noticed you" ambient replies.
  if (message.from?.is_bot || message.sender_chat) {
    return Response.json({ ok: true });
  }

  // Trivia answers -- checked for every real member message so anyone
  // can answer, not just whoever the bot happens to be replying to
  // (same "first correct answer in chat wins" shape as the old
  // ChatFight bot). getActiveTrivia already clears an expired question
  // itself (see lib/telegramGame.js), so a late lucky guess never scores.
  const trivia = await getActiveTrivia(chatId);
  if (trivia && isCorrectAnswer(trivia.question, text)) {
    await clearActiveTrivia(chatId);
    const username = message.from?.username || message.from?.first_name || "anon";
    const { previousScore, newScore } = await recordWin(chatId, message.from.id, username);
    const promotion = promotionOnWin(previousScore, newScore);
    const reply = promotion
      ? `✅ Correct, ${username}! +1 point -- and that's a promotion: welcome to ${promotion.title} 🎉`
      : `✅ Correct, ${username}! +1 point. /leaderboard to see standings.`;
    await sendText(chatId, reply, messageId);
    return Response.json({ ok: true });
  }

  // Passive: reply to every on-topic message (burn/stake/trade/credits
  // keywords), gated only by a per-chat cooldown so a run of consecutive
  // on-topic messages doesn't get a reply each -- not by a coin flip that
  // used to skip most of them.
  const now = Date.now();
  const last = lastOrganicReply.get(chatId) ?? 0;
  if (now - last < ORGANIC_COOLDOWN_MS) return Response.json({ ok: true });

  const topic = findTopicGif(text);
  if (topic) {
    lastOrganicReply.set(chatId, now);
    // Coin flip between a meme gif and a persona one-liner so the chat
    // doesn't get the same reply shape every time.
    if (Math.random() < 0.5) {
      await sendAnimation(chatId, topic.gif, topic.caption, messageId);
    } else {
      const persona = randomPersona();
      const liveFactsLine = await getLiveFactsLine();
      const line = await generatePersonaLine(persona, text, liveFactsLine);
      if (line) await sendText(chatId, line, messageId);
    }
  }

  return Response.json({ ok: true });
}

// Telegram never sends GET, but useful for a manual "is this deployed"
// sanity check.
export async function GET() {
  return Response.json({ ok: true, bot: "@InternCrew_bot" });
}
