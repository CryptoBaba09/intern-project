// Finds this run's candidate posts: recent (7-day, included in every
// paid tier -- see .env.example) tweets matching SEARCH_QUERY, ranked
// by a simple engagement score, deduped against posts/authors this bot
// already replied to recently.

function engagementScore(metrics) {
  if (!metrics) return 0;
  // Weighted toward retweets/quotes (real distribution) over likes
  // (passive) or replies (can be bait-driven) -- tune as real data on
  // what actually drives clicks to the profile comes in.
  return (
    (metrics.like_count || 0) * 1 +
    (metrics.retweet_count || 0) * 3 +
    (metrics.quote_count || 0) * 3 +
    (metrics.reply_count || 0) * 1.5
  );
}

// `readClient` is the .readOnly client from lib/xClient.js's
// makeReadClient. `alreadyHandled` is a Set of already-replied tweet
// ids (this run's own log check happens in index.js before this is
// called for a given candidate) -- this function itself only excludes
// on the RECENTLY-replied-author cooldown, since checking that needs
// the DB, not the search results.
export async function findTopTargets(readClient, config, recentlyRepliedAuthorIds) {
  const res = await readClient.v2.search(config.searchQuery, {
    max_results: 100,
    "tweet.fields": ["public_metrics", "author_id", "created_at", "lang"],
    expansions: ["author_id"],
    "user.fields": ["username"],
  });

  const tweets = res.data?.data || res.tweets || [];
  const usersById = new Map((res.includes?.users || []).map((u) => [u.id, u]));

  const candidates = tweets
    .filter((t) => !recentlyRepliedAuthorIds.has(t.author_id))
    .map((t) => ({
      id: t.id,
      text: t.text,
      authorId: t.author_id,
      authorUsername: usersById.get(t.author_id)?.username || t.author_id,
      score: engagementScore(t.public_metrics),
      createdAt: t.created_at,
    }))
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, config.targetCount);
}
