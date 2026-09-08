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
const ORGANIC_COOLDOWN_MS = 90_000;
const ORGANIC_CHANCE = 0.12; // chance an eligible message gets a passive reply

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

async function generatePersonaLine(persona, triggerText) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
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
        messages: [{ role: "user", content: `Chat message: "${triggerText.slice(0, 300)}"` }],
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
      return sendAnimation(chatId, "/bot-assets/x-gif-burn-ticker.gif", text, messageId);
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
    const line = await generatePersonaLine(persona, text);
    if (line) await sendText(chatId, line, messageId);
    return Response.json({ ok: true });
  }

  // Passive: occasionally react to on-topic keywords, cooldown-limited so
  // the bot doesn't spam a busy chat.
  const now = Date.now();
  const last = lastOrganicReply.get(chatId) ?? 0;
  if (now - last < ORGANIC_COOLDOWN_MS) return Response.json({ ok: true });

  const topic = findTopicGif(text);
  if (topic && Math.random() < ORGANIC_CHANCE) {
    lastOrganicReply.set(chatId, now);
    // Coin flip between a meme gif and a persona one-liner so the chat
    // doesn't get the same reply shape every time.
    if (Math.random() < 0.5) {
      await sendAnimation(chatId, topic.gif, topic.caption, messageId);
    } else {
      const persona = randomPersona();
      const line = await generatePersonaLine(persona, text);
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
