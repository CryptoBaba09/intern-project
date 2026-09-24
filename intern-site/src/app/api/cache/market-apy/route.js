// Live borrow/supply APY for one or more CacheBorrow markets, proxied
// from Morpho's own public GraphQL API (the same source used to vet
// which markets were real/liquid enough to allowlist in the first
// place -- see docs/cache-borrow-spec.md). Kept server-side, same
// pattern as /api/stake/apy, rather than fetched directly from the
// client: one place to cache/rate-limit, and callers never need to
// know which upstream computes it.
//
// This is display-only. Anything safety-critical (collateral value,
// health factor, whether a position is actually healthy) is computed
// client-side straight from an on-chain oracle read in useCacheBorrow.js,
// never from this route -- an API outage here should never be able to
// make a position look safer than it is.
const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";
const ROBINHOOD_CHAIN_ID = 4663;

export const revalidate = 60;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return Response.json({ error: "Missing ?ids= (comma-separated market ids)" }, { status: 400 });
  }

  try {
    const res = await fetch(MORPHO_GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `query M($ids: [String!], $chainId: Int!) {
          markets(where: { uniqueKey_in: $ids, chainId_in: [$chainId] }) {
            items { marketId state { borrowApy supplyApy utilization } }
          }
        }`,
        variables: { ids, chainId: ROBINHOOD_CHAIN_ID },
      }),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return Response.json({ error: `Morpho API returned ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    if (json.errors) {
      return Response.json({ error: json.errors[0]?.message || "Morpho API error" }, { status: 502 });
    }

    const rates = {};
    for (const item of json.data?.markets?.items ?? []) {
      rates[item.marketId] = {
        borrowApy: item.state?.borrowApy ?? null,
        supplyApy: item.state?.supplyApy ?? null,
        utilization: item.state?.utilization ?? null,
      };
    }

    return Response.json({ rates, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to fetch market rates" }, { status: 502 });
  }
}
