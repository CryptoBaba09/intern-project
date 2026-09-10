// Server-side proxy for the Genesis NFT page's live volume gate.
//
// Originally summed PAIR's /trades history to get true cumulative volume
// since launch -- but verified live (2026-09-07) that endpoint returns
// `total: 0` for $INTERN despite real trades having happened. $INTERN
// launched via the newer "Launch V2" system, and PAIR's own token object
// sources ITS volume figures from DexScreener (marketDataSource:
// "dexscreener"), not its own trade indexer -- V2 trades evidently aren't
// indexed there (yet). Confirmed by cross-checking: /trades = 0 items,
// but /api/tokens/:address's combinedVolume24hUsd was nonzero.
//
// So this uses that same 24h figure instead. It is NOT true
// cumulative-since-launch volume -- it's a rolling 24h window. That's
// fine and effectively equivalent for now (the token is under a day old,
// so nothing has rolled off the window yet), but it will start
// UNDER-counting real cumulative volume once $INTERN is older than 24h
// (old volume ages out of the window instead of staying counted). Revisit
// this once that matters -- e.g. a small persisted counter this route
// increments on each poll, rather than trusting a rolling window as a
// stand-in for a lifetime total.
// BROKEN as of the 2026-09-10 migration off PAIR to Pons -- pair.fund's
// API is dead for this purpose regardless of address (see
// AnnouncementBar.js/BurnToCreateView.js for the migration story). Pons
// doesn't publish a documented public REST API the way PAIR did (see
// docs.ponsfamily.com/v2's Integration section -- it's all direct
// on-chain reads: TokenLaunched/Swap events, slot0, graduationStatus).
// The honest fix is indexing $INTERN's own Swap events directly (Pons's
// own docs recommend exactly this as the trust-minimized approach) and
// summing volume ourselves, not depending on a third party's endpoint.
// That's real work, not done here -- this route currently 502s and the
// Genesis page's volume gate goes quiet rather than showing stale/wrong
// numbers (see the catch in HomeView.js's useLiveStats and
// GenesisView.js). Left the v2 address in so whoever builds the real
// indexer starts from the right token.
const TOKEN_ADDRESS = "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8";
const TARGET_USD = 1_000_000;

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(`https://pair.fund/api/tokens/${TOKEN_ADDRESS}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`PAIR tokens API returned ${res.status} -- this route needs a Pons-based rewrite, see file header`);
    const data = await res.json();
    const volumeUsd = Number(data.combinedVolume24hUsd ?? data.volume24hUsd ?? 0) || 0;
    const progressPct = Math.min(100, (volumeUsd / TARGET_USD) * 100);

    return Response.json({
      volumeUsd,
      targetUsd: TARGET_USD,
      progressPct,
      isRolling24h: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to fetch volume" }, { status: 502 });
  }
}
