import { buildCommentSystemPrompt } from "./persona.js";

// Same Anthropic Messages API call shape as intern-site's
// generatePersonaLine (api/telegram/webhook/route.js) -- Haiku, short
// max_tokens, one grounded system prompt. Returns null (skip this
// target) rather than throwing, on any failure -- a missed reply this
// hour is fine; a crashed run that skips the other 9 targets is not.
export async function generateComment(config, target) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system: buildCommentSystemPrompt(),
        messages: [
          {
            role: "user",
            content: `Post you're replying to (by @${target.authorUsername}):\n"${target.text.slice(0, 500)}"`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[x-bot] Anthropic error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error("[x-bot] generateComment error:", err);
    return null;
  }
}
