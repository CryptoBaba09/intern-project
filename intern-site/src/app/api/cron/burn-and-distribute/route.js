// Runs the $INTERN burn bot's cycle (claim creator fees -> split
// 70/20/10 -> burn/distribute/treasury) on a schedule via Vercel Cron,
// instead of intern-burn-bot/index.js's own node-cron scheduling.
//
// WHY THIS EXISTS: the standalone bot only schedules itself while its
// own node process stays running forever (cron.schedule() inside
// index.js). Nothing in this project ever deployed it as a persistent
// process anywhere -- confirmed 2026-09-16 by checking for RewardAdded/
// RewardParked events on InternStakingRewards: zero, all-time, despite
// real $INTERN already staked. This route reuses the exact same lib/
// logic (copied, not rewritten -- see each file's own history in
// intern-burn-bot/lib/) but runs it as a scheduled serverless
// invocation on infrastructure this project already deploys to.
//
// BOT_PRIVATE_KEY must be 0x163c267e80f02e849fe2982affcfe0810347a3bf's
// key -- NOT the key in intern-burn-bot/.env, which is the wrong
// wallet. That address is already Pons's creatorFeeRecipient for
// $INTERN and already the owner of InternStakingRewards /
// InternRewardsRouter, so running as it needs zero on-chain
// transferOwnership/transferCreatorFeeRecipient calls -- an earlier
// plan proposed exactly those and was superseded once this simpler
// fix was confirmed. Full history in docs/burn-bot-cron-migration.md.
//
// Vercel Cron sends a GET request with an Authorization header set to
// `Bearer ${CRON_SECRET}` (the same env var configured in
// vercel.json's cron entry and this project's Vercel dashboard) --
// checking it here is what stops anyone else from hitting this public
// URL and triggering a real cycle on demand.
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { getConfig } from "./lib/config";
import { runCycle } from "./lib/runCycle";
import { recordDistribution } from "../../../lib/distributionHistory";

const DISTRIBUTOR_TOTAL_STAKED_ABI = ["function totalStaked() view returns (uint256)"];

export const runtime = "nodejs";
// Hobby plan's actual ceiling. Several sequential on-chain
// transactions (sweep, claim, distribute, buy, burn), each awaiting
// confirmation, could plausibly approach this on a slow RPC round-trip
// -- if a cycle ever gets killed mid-way, the next scheduled run picks
// up any leftover ETH/$INTERN automatically (see runCycle.js's
// carryover handling), so a timeout here is not fund-losing, just a
// delayed cycle.
export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    // Missing/misconfigured env vars -- fail loudly and visibly in
    // Vercel's function logs, same "fail closed at the point of use"
    // style as lib/mongodb.js, rather than a build-time landmine.
    console.error("[cron/burn-and-distribute] Config error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  try {
    const result = await runCycle(wallet, config);

    // Record real distribution history for the /stake APY stat -- only
    // when BE actually moved and only for a real (non-dry) run.
    // swapEthForBe still returns a quoted amount under dryRun (see its
    // own comments) with no swap ever executed, so persisting that
    // would record BE that was never actually sent -- exactly the kind
    // of fake-number-in-a-real-stat this project has spent this whole
    // week stripping out elsewhere.
    if (!config.dryRun && result.beDistributed > 0n && config.distributorAddress) {
      try {
        const distributor = new ethers.Contract(
          config.distributorAddress,
          DISTRIBUTOR_TOTAL_STAKED_ABI,
          provider
        );
        const totalStakedWei = await distributor.totalStaked();
        await recordDistribution({ beDistributedWei: result.beDistributed, totalStakedWei });
      } catch (recordErr) {
        // Never let a history-recording failure fail the cycle itself --
        // the real distribution already happened on-chain regardless of
        // whether this stat gets to see it. Logged loudly so it doesn't
        // go unnoticed.
        console.error("[cron/burn-and-distribute] Failed to record distribution history:", recordErr.message);
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun: config.dryRun,
      ethClaimed: result.ethClaimed.toString(),
      internBurned: result.internBurned.toString(),
      beDistributed: result.beDistributed.toString(),
    });
  } catch (err) {
    // Deliberately NOT swallowed here (unlike the standalone bot's own
    // runCycle, which had to stay alive for its next node-cron tick in
    // the same process). Each Cron invocation is already independent --
    // letting this propagate means a failed cycle shows up as a failed
    // run in Vercel's Cron dashboard, not a silent no-op.
    console.error("[cron/burn-and-distribute] Cycle failed:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
