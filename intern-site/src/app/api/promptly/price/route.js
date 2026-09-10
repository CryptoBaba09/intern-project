import { fetchInternPriceUsd } from "../../../lib/ponsPrice";

// Tiny read-only helper so the /inference-credits UI can show a live
// "you'll get about $X credit" estimate before the user commits to
// burning anything. The actual credit calculation on redemption
// re-fetches this server-side anyway -- this route is purely a display
// convenience.
//
// Price comes from Pons's own bonding-curve reserves (lib/ponsPrice.js)
// -- pair.fund's API, which this used to call, is dead as of the
// 2026-09-10 migration.
export const revalidate = 30;

export async function GET() {
  try {
    const priceUsd = await fetchInternPriceUsd();
    return Response.json({ priceUsd, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to fetch price" }, { status: 502 });
  }
}
