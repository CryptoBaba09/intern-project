import { randomQuestion, setActiveTrivia } from "../../../lib/telegramGame";

// Posts a trivia question into the community group on a schedule (see
// ../../../../../../.github/workflows/telegram-game-ticker.yml -- every
// few hours), so the game is a constant, ambient thing rather than only
// existing when someone remembers to type /trivia. Deliberately its own
// route + secret, same "one secret per direction" pattern as
// api/telegram/announce/route.js: that route verifies "something outside
// pushing an announcement", this one verifies "something outside
// starting a game round" -- different privilege, different secret, even
// though both ultimately call sendMessage.
//
// The question itself is written to the SAME Mongo-backed active-trivia
// state the webhook route reads (lib/telegramGame.js) -- that's what
// lets someone answer a question this route posted, from the webhook
// route, which is a different serverless function/module instance.

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

export async function POST(req) {
  const secret = req.headers.get("x-autotrivia-secret");
  if (!process.env.TELEGRAM_AUTOTRIVIA_SECRET || secret !== process.env.TELEGRAM_AUTOTRIVIA_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }
  if (!process.env.TELEGRAM_CHAT_ID) {
    return Response.json({ error: "TELEGRAM_CHAT_ID not configured -- see docs/telegram-bot.md" }, { status: 500 });
  }

  const question = randomQuestion();
  await setActiveTrivia(process.env.TELEGRAM_CHAT_ID, question);

  try {
    await tg("sendMessage", {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: `🧠 Trivia time: ${question.q}\n\nFirst correct answer in chat wins a point.`,
    });
  } catch (err) {
    console.error("[telegram/auto-trivia] send failed:", err);
    return Response.json({ error: "Failed to post question" }, { status: 502 });
  }

  return Response.json({ ok: true, question: question.q });
}

export async function GET() {
  return Response.json({ ok: true, route: "auto-trivia" });
}
