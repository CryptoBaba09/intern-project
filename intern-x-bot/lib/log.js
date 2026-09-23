import { MongoClient } from "mongodb";

// Same connection-caching shape as intern-site's lib/mongodb.js
// (module-level cached promise), adapted for a plain Node script
// instead of Next.js's hot-reload/serverless-instance concerns -- this
// runs once per GitHub Actions invocation and exits, so there's no
// warm-instance reuse to worry about, just "don't open two connections
// in one run by accident".
let clientPromise;

function getClientPromise(uri) {
  if (!clientPromise) clientPromise = new MongoClient(uri).connect();
  return clientPromise;
}

async function getCollection(config) {
  const client = await getClientPromise(config.mongodbUri);
  return client.db("intern").collection("xGrowthBotLog");
}

// Real audit trail -- every reply this fully-autonomous bot ever sends
// gets one doc here: what post it replied to, what it said, whether it
// was a dry run, and when. This is the accountability mechanism in
// place of a human approving each post (see docs/x-growth-bot.md for
// why that trade-off was made) -- if anything looks off, this
// collection is where to check what the bot actually did and why.
export async function recordReply(config, { targetId, targetAuthorId, targetAuthorUsername, targetText, comment, postedTweetId, dryRun }) {
  const col = await getCollection(config);
  await col.insertOne({
    targetId,
    targetAuthorId,
    targetAuthorUsername,
    targetText,
    comment,
    postedTweetId: postedTweetId || null,
    dryRun,
    createdAt: new Date(),
  });
}

// Keyed by author id (stable), not username (can change) -- used by
// lib/targets.js to filter out authors this bot already replied to
// within AUTHOR_COOLDOWN_HOURS.
export async function getRecentlyRepliedAuthorIds(config) {
  const col = await getCollection(config);
  const since = new Date(Date.now() - config.authorCooldownHours * 3600_000);
  const docs = await col.find({ createdAt: { $gte: since } }).project({ targetAuthorId: 1 }).toArray();
  return new Set(docs.map((d) => d.targetAuthorId));
}

export async function alreadyRepliedToTarget(config, targetId) {
  const col = await getCollection(config);
  const existing = await col.findOne({ targetId });
  return Boolean(existing);
}

export async function closeLogConnection() {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
  }
}
