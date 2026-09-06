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
const TOKEN_ADDRESS = "0x692f212e73aef5c81ee74e46867ffb139eb25555";
const TARGET_USD = 1_000_000;

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(`https://pair.fund/api/tokens/${TOKEN_ADDRESS}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`PAIR tokens API returned ${res.status}`);
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
