import { GECKOTERMINAL_POOL_ADDRESS } from "../../lib/pools";

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
// BROKEN as of the 2026-09-10 migration off PAIR to Pons -- pair.fund's
// API is dead for this purpose regardless of address (see
// AnnouncementBar.js/BurnToCreateView.js for the migration story). Pons
// doesn't publish a documented public REST API the way PAIR did (see
// docs.ponsfamily.com/v2's Integration section -- it's all direct
// on-chain reads: TokenLaunched/Swap events, slot0, graduationStatus).
//
// Fixed by pointing at GeckoTerminal's pool endpoint instead -- the same
// trusted source TradeView/pools.js already link out to for the live
// chart, and confirmed live (2026-09-18) to return this pool's real
// volume_usd.h24 figure.
//
// This is STILL a rolling 24h window, not true cumulative-since-launch
// volume -- that was an acceptable stand-in when this route was written
// and $INTERN was under a day old (nothing had rolled off the window
// yet). It no longer is: $INTERN migrated to this address on 2026-09-10,
// more than a day ago, so a 24h window now UNDER-counts real cumulative
// volume (older volume ages out instead of staying counted) rather than
// approximating it. The honest fix is indexing $INTERN's own Swap events
// on Pons directly (Pons's own docs recommend exactly this as the
// trust-minimized approach) and summing volume ourselves -- real work,
// not done here. Until then this route reports what it actually has
// (real, live, but rolling) and GenesisView.js discloses the gap rather
// than presenting it as the true lifetime total.
const TARGET_USD = 1_000_000;

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/robinhood/pools/${GECKOTERMINAL_POOL_ADDRESS}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`GeckoTerminal pools API returned ${res.status}`);
    const data = await res.json();
    const volumeUsd = Number(data?.data?.attributes?.volume_usd?.h24 ?? 0) || 0;
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
