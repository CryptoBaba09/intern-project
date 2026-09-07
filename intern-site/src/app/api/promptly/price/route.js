import { CONTRACTS } from "../../../lib/chain";

// Tiny read-only helper so the /inference-credits UI can show a live
// "you'll get about $X credit" estimate before the user commits to
// burning anything, without hitting PAIR's API directly from the browser
// (their API isn't necessarily meant for arbitrary cross-origin fetches).
// The actual credit calculation on redemption re-fetches this server-side
// anyway -- this route is purely a display convenience.
export const revalidate = 30;

export async function GET() {
  try {
    const res = await fetch(`https://pair.fund/api/tokens/${CONTRACTS.internToken}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`PAIR tokens API returned ${res.status}`);
    const data = await res.json();
    const priceUsd = Number(data.priceUsd ?? data.compositePriceUsd ?? 0) || null;
    return Response.json({ priceUsd, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to fetch price" }, { status: 502 });
  }
}
