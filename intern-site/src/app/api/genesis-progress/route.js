// Server-side proxy for the Genesis NFT page's live volume gate. Calls
// PAIR's public trades API from the server (not the browser) to avoid
// depending on PAIR setting CORS headers for that endpoint, and because
// the milestone needs CUMULATIVE volume since launch, not the 24h figure
// PAIR's token object exposes directly -- so this sums valueUsd across
// trade history pages instead.
//
// $INTERN launched 2026-09-06 with near-zero volume so far, so a handful
// of pages comfortably covers everything to date. If real volume picks up
// enough that trade count blows past this cap, this starts under-counting
// (never over-) -- worth switching to a cached/incremental tally at that
// point rather than raising the cap further.
const TOKEN_ADDRESS = "0x692f212e73aef5c81ee74e46867ffb139eb25555";
const TARGET_USD = 1_000_000;
const MAX_PAGES = 20;
const PAGE_LIMIT = 50;

export const revalidate = 60;

export async function GET() {
  try {
    let volumeUsd = 0;
    let page = 1;
    let total = Infinity;
    let cappedOut = false;

    while ((page - 1) * PAGE_LIMIT < total && page <= MAX_PAGES) {
      const res = await fetch(
        `https://pair.fund/api/tokens/${TOKEN_ADDRESS}/trades?page=${page}&limit=${PAGE_LIMIT}`,
        { next: { revalidate: 60 } }
      );
      if (!res.ok) throw new Error(`PAIR trades API returned ${res.status}`);
      const data = await res.json();
      total = data.total ?? 0;
      for (const trade of data.items ?? []) {
        volumeUsd += Number(trade.valueUsd) || 0;
      }
      if (page === MAX_PAGES && (page - 1) * PAGE_LIMIT < total) cappedOut = true;
      page += 1;
    }

    const progressPct = Math.min(100, (volumeUsd / TARGET_USD) * 100);

    return Response.json({
      volumeUsd,
      targetUsd: TARGET_USD,
      progressPct,
      cappedOut,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to fetch volume" }, { status: 502 });
  }
}
