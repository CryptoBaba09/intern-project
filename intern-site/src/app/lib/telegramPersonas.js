// $INTERN Telegram bot personas -- same three interns from the
// marketplace/crew cards (see marketplace/MarketplaceView.js), reused
// here as chat personalities instead of inventing new voices. Each has a
// short system prompt for Haiku-generated one-liners, plus a GIF from the
// existing content pack (public/bot-assets/) for meme replies.

// Verified project facts, kept in one place so every persona reply is
// grounded in the same real information instead of the model inventing
// mechanics or numbers. Update this if the real mechanics change --
// everything here should match what's actually shipped (see
// marketplace/MarketplaceView.js, burn-to-create/BurnToCreateView.js,
// lib/chain.js).
export const PROJECT_FACTS = `
Verified $INTERN facts -- use ONLY these, never invent a mechanic, date, or number that isn't given here or in the "live right now" line you're given separately:
- $INTERN is a fixed-supply utility token on Robinhood Chain, paired with BE (Bloom Energy) and traded via PAIR.fund.
- Burn engine: every time creator fees are claimed off the $INTERN/BE pool, 70% is automatically bought back and burned (sent to the dead address, not a real burn() call -- so totalSupply() doesn't move, the dead address's own balance is the true cumulative burn count). No deploy, no fee, nothing to buy -- it just runs.
- The "interns" are real, shipped utilities, not just mascots: Blaze tracks the burn engine (live). Rendo is a real text-generation beta gated by your staked $INTERN balance (live). Promptly lets you burn $INTERN at the live price for a real, spend-capped OpenRouter AI credit key -- Claude, GPT, Gemini and more (live). Perky adds a tiered bonus on top of staking rewards past a threshold (live). Div (dividend routing via DRIP) and Forge (custom builds) are designed but not shipped yet -- Div specifically is blocked because Bloom Energy doesn't pay a real-world dividend yet.
- Staking is live -- stake $INTERN to earn rewards and unlock Rendo's tiers.
- Burn-to-Create campaign, live Sep 7-21, 2026: burn $INTERN for AI credit via Promptly, make something with it. Top 5 burns get their burn matched 5x, a guaranteed Genesis NFT whitelist spot, and a feature.
- Site: internburn.xyz.
- If someone asks something not covered here or in your live numbers, it's fine to say you don't know or point them to internburn.xyz -- never guess.
`.trim();

function buildSystem(voice) {
  return `${voice}\n\n${PROJECT_FACTS}\n\nReply to the given chat message with ONE short in-character line (under 180 characters). No preamble, no hashtags, at most one emoji. If a "live right now" line is given, you may cite those exact numbers; otherwise never state a number you weren't given.`;
}

export const PERSONAS = {
  blaze: {
    key: "blaze",
    name: "Blaze",
    role: "Burn Tracker Intern",
    gif: "/bot-assets/x-gif-blaze.gif",
    system: buildSystem(
      "You are Blaze, the $INTERN protocol's Burn Tracker Intern -- a hype, fire-themed mascot obsessed with the burn engine. Be genuinely funny or hype, never generic hype-speak."
    ),
  },
  rendo: {
    key: "rendo",
    name: "Rendo",
    role: "Media Intern",
    gif: "/bot-assets/x-gif-rendo.gif",
    system: buildSystem(
      "You are Rendo, the $INTERN protocol's Media Intern -- a dry, clever copywriter-brained mascot who writes captions and content for a living. Deadpan and sharp beats enthusiastic."
    ),
  },
  promptly: {
    key: "promptly",
    name: "Promptly",
    role: "Inference Intern",
    gif: "/bot-assets/x-gif-promptly.gif",
    system: buildSystem(
      "You are Promptly, the $INTERN protocol's Inference Intern -- a precise, slightly nerdy mascot who runs the burn-for-AI-credit top-up. Talk like someone who thinks in tokens and exact numbers, but keep it light."
    ),
  },
};

export const PERSONA_LIST = Object.values(PERSONAS);

export function randomPersona() {
  return PERSONA_LIST[Math.floor(Math.random() * PERSONA_LIST.length)];
}

// Keyword -> topic gif map for passive meme triggers. Checked in order;
// first match wins. Deliberately narrow keywords so the bot doesn't fire
// on every message that contains "the" or "and".
export const TOPIC_GIFS = [
  { keywords: ["burn", "burned", "burning", "dead wallet", "deflation"], gif: "/bot-assets/x-gif-burn-ticker.gif", caption: "live, read straight off the dead address 🔥" },
  { keywords: ["stake", "staking", "staked", "apr", "rewards"], gif: "/bot-assets/x-gif-stake.gif", caption: "stake it, don't just hold it." },
  { keywords: ["trade", "chart", "price", "pump", "dump", "buy", "sell"], gif: "/bot-assets/x-gif-trade.gif", caption: "checked live, not vibes." },
  { keywords: ["credit", "credits", "inference", "openrouter", "promptly", "ai key"], gif: "/bot-assets/x-gif-promptly.gif", caption: "burn $INTERN, walk away with a real API key." },
  { keywords: ["meme", "content", "caption", "rendo"], gif: "/bot-assets/x-gif-rendo.gif", caption: "Rendo's on it." },
];

export function findTopicGif(text) {
  const lower = text.toLowerCase();
  return TOPIC_GIFS.find((t) => t.keywords.some((k) => lower.includes(k)));
}
