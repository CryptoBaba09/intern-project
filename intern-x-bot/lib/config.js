// Central env loading + validation -- same "fail closed at point of
// use, not at import time" discipline as intern-site/src/app/lib/mongodb.js,
// so `node index.js --help`-style dry inspection never crashes just
// because a var isn't set yet.
export function getConfig() {
  return {
    xApiKey: process.env.X_API_KEY,
    xApiSecret: process.env.X_API_SECRET,
    xAccessToken: process.env.X_ACCESS_TOKEN,
    xAccessSecret: process.env.X_ACCESS_SECRET,
    xBearerToken: process.env.X_BEARER_TOKEN,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    xaiApiKey: process.env.XAI_API_KEY || null,
    mongodbUri: process.env.MONGODB_URI,
    targetCount: Number(process.env.TARGET_COUNT || 10),
    searchQuery:
      process.env.SEARCH_QUERY ||
      '(crypto OR "AI agent" OR "AI agents" OR web3 OR defi) -is:retweet lang:en',
    authorCooldownHours: Number(process.env.AUTHOR_COOLDOWN_HOURS || 24),
    dryRun: (process.env.DRY_RUN ?? "true").toLowerCase() !== "false",
  };
}

export function assertReadyToRun(config) {
  const missing = [];
  if (!config.xBearerToken) missing.push("X_BEARER_TOKEN");
  if (!config.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (!config.mongodbUri) missing.push("MONGODB_URI");
  if (!config.dryRun) {
    if (!config.xApiKey) missing.push("X_API_KEY");
    if (!config.xApiSecret) missing.push("X_API_SECRET");
    if (!config.xAccessToken) missing.push("X_ACCESS_TOKEN");
    if (!config.xAccessSecret) missing.push("X_ACCESS_SECRET");
  }
  if (missing.length) {
    throw new Error(`Missing required env var(s): ${missing.join(", ")}. See .env.example.`);
  }
}
