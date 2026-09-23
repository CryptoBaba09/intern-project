import { getDb } from "./mongodb";

// Replaces the third-party "ChatFight" mini-game bot that used to run
// in the $INTERN Community group -- same "answer to score a point"
// shape, but ours: grounded in real project facts (see PROJECT_FACTS in
// telegramPersonas.js) instead of a generic photo-guessing game with no
// connection to $INTERN, with a real persistent leaderboard, and with
// an on-brand promotion-ladder twist instead of a flat score number --
// see RANK_TIERS below.
export const TRIVIA_QUESTIONS = [
  { q: "What % of every claimed creator fee gets bought back and burned?", a: ["70", "70%"] },
  { q: "What % of every claimed creator fee streams to stakers?", a: ["20", "20%"] },
  { q: "What % of every claimed creator fee goes to treasury?", a: ["10", "10%"] },
  { q: "Which intern is the Burn Tracker?", a: ["blaze"] },
  { q: "Which intern runs the burn-for-AI-credit top-up?", a: ["promptly"] },
  { q: "Which intern is the face of $interndex?", a: ["hush"] },
  { q: "Which intern maps burn history and staking flow as a connectome?", a: ["synapse"] },
  { q: "Which intern runs text and video generation?", a: ["rendo"] },
  { q: "What's the fee cut on every $interndex swap, auto-bought-back and burned?", a: ["0.2", "0.2%", ".2%"] },
  { q: "What DEX does $INTERN v2 trade on?", a: ["pons", "ponsfamily"] },
  { q: "What's the burn address every burned $INTERN actually sits in?", a: ["dead", "0x000000000000000000000000000000000000dead"] },
  { q: "What AI credit provider does Promptly's top-up key work with?", a: ["openrouter"] },
  { q: "What chain does $INTERN live on?", a: ["robinhood", "robinhood chain"] },
  { q: "True or false: burning $INTERN calls a real burn() function that reduces totalSupply().", a: ["false"] },
  { q: "True or false: v2 $INTERN staking is live and accepting new stakers.", a: ["false"] },
  { q: "True or false: Rendo's video generation is burn-based, not stake-gated.", a: ["true"] },
  { q: "True or false: the burn/distribute/treasury split is fully automatic today.", a: ["false"] },
  { q: "Which intern's role is 'Research Intern'?", a: ["synapse"] },
  { q: "How many chains can you swap into $INTERN from via $interndex? (Robinhood Chain + how many others)", a: ["3", "three"] },
  { q: "What was $INTERN's DEX before it migrated to Pons?", a: ["pair", "pair.fund"] },
];

// On-brand promotion ladder instead of a bare score number -- fits the
// whole "$INTERN" bit better than a generic leaderboard, and gives
// people something to chase past just "+1".
export const RANK_TIERS = [
  { min: 0, title: "Unpaid Intern" },
  { min: 5, title: "Intern" },
  { min: 15, title: "Senior Intern" },
  { min: 30, title: "Team Lead" },
  { min: 50, title: "Burn Master" },
];

export function rankForScore(score) {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (score >= tier.min) rank = tier;
  }
  return rank;
}

// Returns the tier just promoted INTO if this new score is exactly the
// threshold for a tier above the previous score's tier, else null --
// used to fire a one-off "promoted!" message instead of announcing the
// same rank on every single win.
export function promotionOnWin(previousScore, newScore) {
  const before = rankForScore(previousScore);
  const after = rankForScore(newScore);
  return after.title !== before.title ? after : null;
}

export function randomQuestion() {
  return TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
}

// Loose match: correct if the answer text contains any accepted answer
// as a substring, case-insensitive. Deliberately lenient (a trivia bot
// that's pedantic about "70" vs "70%" just annoys people) over strict.
export function isCorrectAnswer(question, text) {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  return question.a.some((accepted) => lower.includes(accepted));
}

async function scoresCollection() {
  const db = await getDb();
  return db.collection("telegramGameScores");
}

// One doc per (chatId, userId) pair -- scores are per-chat, not global,
// same as the ChatFight bot's own "local game leaderboard" language, so
// this doesn't feel like a regression to anyone used to it. Returns the
// score BEFORE and AFTER the increment so the caller can detect a
// rank-up (see promotionOnWin above) without a second read.
export async function recordWin(chatId, userId, username) {
  const col = await scoresCollection();
  const before = await col.findOne({ chatId: String(chatId), userId: String(userId) });
  const previousScore = before?.score || 0;
  await col.updateOne(
    { chatId: String(chatId), userId: String(userId) },
    {
      $inc: { score: 1 },
      $set: { username: username || "anon", lastWinAt: new Date() },
      $setOnInsert: { chatId: String(chatId), userId: String(userId), createdAt: new Date() },
    },
    { upsert: true }
  );
  return { previousScore, newScore: previousScore + 1 };
}

export async function getLeaderboard(chatId, limit = 10) {
  const col = await scoresCollection();
  return col
    .find({ chatId: String(chatId) })
    .sort({ score: -1 })
    .limit(limit)
    .toArray();
}

// --- Active question state ---
//
// Moved to Mongo (was an in-memory Map) because /trivia can now be
// triggered two ways that are genuinely different serverless functions
// in Vercel -- the webhook route (a person typing /trivia) and the new
// auto-trivia route (api/telegram/auto-trivia, called on a schedule by
// .github/workflows/telegram-game-ticker.yml). Two separate route
// modules can't share one in-process Map; both need to read/write the
// SAME "what's the active question in this chat right now" state, so
// it has to live somewhere both can reach.
export const TRIVIA_TIMEOUT_MS = 10 * 60_000;

async function activeTriviaCollection() {
  const db = await getDb();
  return db.collection("telegramActiveTrivia");
}

export async function setActiveTrivia(chatId, question) {
  const col = await activeTriviaCollection();
  await col.updateOne(
    { chatId: String(chatId) },
    { $set: { chatId: String(chatId), question, askedAt: new Date() } },
    { upsert: true }
  );
}

// Returns null if there's no active question OR it already expired
// (and clears it in that case, so a late lucky guess doesn't score).
export async function getActiveTrivia(chatId) {
  const col = await activeTriviaCollection();
  const doc = await col.findOne({ chatId: String(chatId) });
  if (!doc) return null;
  if (Date.now() - new Date(doc.askedAt).getTime() >= TRIVIA_TIMEOUT_MS) {
    await col.deleteOne({ chatId: String(chatId) });
    return null;
  }
  return doc;
}

export async function clearActiveTrivia(chatId) {
  const col = await activeTriviaCollection();
  await col.deleteOne({ chatId: String(chatId) });
}
