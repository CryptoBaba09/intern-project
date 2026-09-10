// Send-side counterpart to api/telegram/webhook/route.js. That route
// only ever REPLIES to messages Telegram pushes to it; this route lets
// something outside Telegram (Claude, after a post goes out on X, or a
// human) trigger an announcement INTO the community group/channel.
//
// Deliberately a manual-trigger endpoint, not an autonomous poster: it
// requires a shared secret and does nothing on a schedule or webhook of
// its own. Matches this project's established pattern of keeping a
// human (or an explicit call) in the loop before anything public and
// hard-to-undo goes out -- same reasoning as never auto-clicking Post
// on X. Call this AFTER an X post is confirmed live, with its real URL,
// not before.
//
// Setup (see docs/telegram-bot.md for the matching webhook setup):
//   1. TELEGRAM_BOT_TOKEN -- already configured for the webhook bot.
//   2. TELEGRAM_CHAT_ID -- the community group/channel's chat id. Find
//      it by sending any message in the target chat, then checking
//      Vercel's function logs for api/telegram/webhook -- it now logs
//      `chat.id` on every incoming message specifically for this.
//   3. TELEGRAM_ANNOUNCE_SECRET -- any random string you generate,
//      separate from TELEGRAM_WEBHOOK_SECRET (that one verifies
//      Telegram->us; this one verifies us->this route, a different
//      direction, so it needs its own secret).
//
// Usage:
//   curl -X POST https://internburn.xyz/api/telegram/announce \
//     -H "content-type: application/json" \
//     -H "x-announce-secret: <TELEGRAM_ANNOUNCE_SECRET>" \
//     -d '{"text": "...", "mediaUrl": "https://...", "mediaType": "video"}'
//
// mediaUrl/mediaType are optional -- omit both for a plain text message.
// mediaType is one of "photo" | "video" | "animation" (gif), matching
// Telegram's own sendPhoto/sendVideo/sendAnimation methods.

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function tg(method, body) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Telegram ${method} failed: ${res.status} ${data?.description || ""}`);
  }
  return data;
}

const MEDIA_METHOD = {
  photo: { method: "sendPhoto", field: "photo" },
  video: { method: "sendVideo", field: "video" },
  animation: { method: "sendAnimation", field: "animation" },
};

export async function POST(req) {
  const secret = req.headers.get("x-announce-secret");
  if (!process.env.TELEGRAM_ANNOUNCE_SECRET || secret !== process.env.TELEGRAM_ANNOUNCE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }
  if (!process.env.TELEGRAM_CHAT_ID) {
    return Response.json({ error: "TELEGRAM_CHAT_ID not configured -- see the setup comment in this file" }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, mediaUrl, mediaType } = body;
  if (!text || typeof text !== "string") {
    return Response.json({ error: "A `text` string is required" }, { status: 400 });
  }
  if (mediaUrl && !MEDIA_METHOD[mediaType]) {
    return Response.json(
      { error: `mediaType must be one of ${Object.keys(MEDIA_METHOD).join(", ")} when mediaUrl is set` },
      { status: 400 }
    );
  }

  try {
    let result;
    if (mediaUrl) {
      const { method, field } = MEDIA_METHOD[mediaType];
      result = await tg(method, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        [field]: mediaUrl,
        caption: text,
      });
    } else {
      result = await tg("sendMessage", {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: false,
      });
    }

    return Response.json({ status: "sent", messageId: result?.result?.message_id });
  } catch (err) {
    console.error("[telegram/announce] failed:", err.message);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
