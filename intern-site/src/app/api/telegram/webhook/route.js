import { createPublicClient, http, formatUnits } from "viem";
import { robinhoodChain, CONTRACTS, DEAD_ADDRESS } from "../../../lib/chain";
import { ERC20_ABI } from "../../../lib/abis";
import { PERSONAS, PERSONA_LIST, randomPersona, findTopicGif } from "../../../lib/telegramPersonas";

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

// BROKEN as of the 2026-09-10 migration off PAIR to Pons -- pair.fund's
// API is dead, so this currently always returns null (fails gracefully;
// see the comment on getLiveFactsLine below for why that's fine here,
// unlike the crediting flows in api/blaze|promptly/topup/route.js).
async function getLivePrice() {
  if (!CONTRACTS.internToken) return null;
  try {
    const res = await fetch(`https://pair.fund/api/tokens/${CONTRACTS.internToken}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.priceUsd ?? data?.price ?? null;
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
        "I'm the $INTERN crew bot -- Blaze, Rendo & Promptly, live in this chat.\n\n" +
          "/crew -- meet the interns\n" +
          "/burn -- live burned total, read from chain\n" +
          "/price -- live $INTERN price\n" +
          "/meme -- random $INTERN meme\n\n" +
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
      return sendAnimation(chatId, persona.gif, `${persona.name}, reporting for duty.`, messageId);
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
      await sendAnimation(
        chatId,
        persona.gif,
        `Welcome, ${names}. ${persona.name} here -- ${persona.role.toLowerCase()}. Say hi, or try /help.`
      );
    }
    return Response.json({ ok: true });
  }

  const text = message.text;
  if (!text) return Response.json({ ok: true });

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
