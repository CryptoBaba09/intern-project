import { getConfig, assertReadyToRun } from "./lib/config.js";
import { makeReadClient, makeWriteClient } from "./lib/xClient.js";
import { findTopTargets } from "./lib/targets.js";
import { generateComment } from "./lib/generateComment.js";
import { recordReply, getRecentlyRepliedAuthorIds, alreadyRepliedToTarget, closeLogConnection } from "./lib/log.js";

// $INTERN's X growth bot -- runs once per invocation (see
// ../.github/workflows/x-growth-bot.yml for the hourly schedule this is
// actually run on). Finds the top TARGET_COUNT trending crypto/AI-agent
// posts, replies to each in the account's own voice (lib/persona.js),
// and logs every single reply for a real audit trail.
//
// Deliberately fully autonomous, no per-post approval gate -- explicit
// product decision (see docs/x-growth-bot.md), not an oversight. The
// safety net is: DRY_RUN defaults true, every reply is logged to Mongo
// before/after posting, and the per-author cooldown + moderate-length
// system prompt keep it from looking like a spam bot fixated on one
// account or one talking point.
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const config = getConfig();
  assertReadyToRun(config);

  console.log(`[x-bot] starting run -- DRY_RUN=${config.dryRun}, targetCount=${config.targetCount}`);

  const readClient = makeReadClient(config);
  const writeClient = config.dryRun ? null : makeWriteClient(config);

  const recentlyRepliedAuthorIds = await getRecentlyRepliedAuthorIds(config);
  console.log(`[x-bot] ${recentlyRepliedAuthorIds.size} author(s) on cooldown`);

  const targets = await findTopTargets(readClient, config, recentlyRepliedAuthorIds);
  console.log(`[x-bot] found ${targets.length} candidate target(s)`);

  let posted = 0;
  for (const target of targets) {
    if (await alreadyRepliedToTarget(config, target.id)) {
      console.log(`[x-bot] skip ${target.id} -- already replied (overlapping run?)`);
      continue;
    }

    const comment = await generateComment(config, target);
    if (!comment) {
      console.log(`[x-bot] skip ${target.id} -- no comment generated`);
      continue;
    }

    let postedTweetId = null;
    if (config.dryRun) {
      console.log(`[x-bot] DRY RUN -- would reply to @${target.authorUsername} (${target.id}):\n  "${comment}"`);
    } else {
      try {
        const result = await writeClient.v2.reply(comment, target.id);
        postedTweetId = result.data?.id || null;
        console.log(`[x-bot] replied to @${target.authorUsername} (${target.id}) -> ${postedTweetId}`);
      } catch (err) {
        console.error(`[x-bot] post failed for ${target.id}:`, err?.message || err);
        continue; // don't log a reply that never actually went out
      }
    }

    await recordReply(config, {
      targetId: target.id,
      targetAuthorId: target.authorId,
      targetAuthorUsername: target.authorUsername,
      targetText: target.text,
      comment,
      postedTweetId,
      dryRun: config.dryRun,
    });
    posted += 1;

    // Small stagger so ten replies don't all land in the same second --
    // not real hour-spacing (this whole run is meant to finish quickly
    // inside one GitHub Actions job), just enough to not look like a
    // burst.
    await sleep(3000);
  }

  console.log(`[x-bot] run complete -- ${posted}/${targets.length} handled`);
}

run()
  .catch((err) => {
    console.error("[x-bot] fatal error:", err);
    process.exitCode = 1;
  })
  .finally(() => closeLogConnection());
