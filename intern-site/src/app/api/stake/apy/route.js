import { createPublicClient, http, formatUnits } from "viem";
import { robinhoodChain, CONTRACTS, isStakingLive } from "../../../lib/chain";
import { STAKING_REWARDS_ABI } from "../../../lib/abis";
import { fetchInternPriceUsd } from "../../../lib/ponsPrice";
import { fetchBePriceUsd } from "../../../lib/bePrice";
import { listDistributions } from "../../../lib/distributionHistory";

// Real staking yield for /stake, computed from actual recorded
// distribution history (see lib/distributionHistory.js) rather than a
// hardcoded promise. Called "APR" here, not "APY" -- BE payouts aren't
// auto-restaked into more $INTERN, so there's no real compounding to
// claim credit for, just a simple annualized rate.
//
// This is only as good as what's been recorded since
// distributionHistory.js started existing -- there's no historical
// backfill (reconstructing it from Robinhood Chain's own Swap/Transfer
// logs would mean scanning tens of millions of blocks per day of
// history on this chain's block rate, not a per-request-safe query
// against a public RPC). Route reports what it actually has and flags
// low-confidence explicitly rather than smoothing over a thin sample.
const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

export const revalidate = 300;

export async function GET() {
  try {
    if (!isStakingLive()) {
      return Response.json({ available: false, reason: "Staking isn't live yet." });
    }

    const distributions = await listDistributions();
    if (distributions.length === 0) {
      return Response.json({
        available: false,
        reason: "Collecting real distribution data — check back after the next cycle.",
      });
    }

    const totalBeDistributedWei = distributions.reduce(
      (sum, d) => sum + BigInt(d.beDistributedWei),
      0n
    );

    // listDistributions returns newest first.
    const latestAt = new Date(distributions[0].recordedAt).getTime();
    const earliestAt = new Date(distributions[distributions.length - 1].recordedAt).getTime();
    const spanDays = (latestAt - earliestAt) / 86_400_000;

    // A single recorded cycle (or several landing on the same day) has
    // no real elapsed span to divide by. Falling back to "treat it as
    // one day's worth" is grounded in the cron's own actual schedule
    // (vercel.json runs it once daily) rather than an invented number --
    // same style of honest, schedule-grounded stand-in GenesisView.js
    // already uses for its own rolling-window volume estimate.
    const effectiveDays = spanDays > 0 ? spanDays : 1;

    const [bePriceUsd, internPriceUsd, totalStakedWei] = await Promise.all([
      fetchBePriceUsd(),
      fetchInternPriceUsd(),
      publicClient.readContract({
        address: CONTRACTS.distributor,
        abi: STAKING_REWARDS_ABI,
        functionName: "totalStaked",
      }),
    ]);

    const totalBeDistributed = Number(formatUnits(totalBeDistributedWei, 18));
    const totalStaked = Number(formatUnits(totalStakedWei, 18));
    const totalStakedUsd = totalStaked * internPriceUsd;

    if (!(totalStakedUsd > 0)) {
      return Response.json({ available: false, reason: "Nobody is staked yet." });
    }

    const beDistributedUsd = totalBeDistributed * bePriceUsd;
    const dailyRateUsd = beDistributedUsd / effectiveDays;
    const aprPct = ((dailyRateUsd * 365) / totalStakedUsd) * 100;

    return Response.json({
      available: true,
      aprPct,
      sampleDays: effectiveDays,
      cycleCount: distributions.length,
      totalStakedUsd,
      // A thin sample (few cycles, short span) makes this noisy, not
      // wrong -- flagged so the UI can say so rather than present it
      // with false confidence.
      lowConfidence: distributions.length < 3 || effectiveDays < 3,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to compute staking APR" }, { status: 502 });
  }
}
