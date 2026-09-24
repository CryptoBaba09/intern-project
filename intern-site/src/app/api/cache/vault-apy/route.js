// Live supply APY for Cache's Steakhouse USDG vault, proxied from
// Morpho's own public GraphQL API. Display-only, same non-safety-
// critical status as /api/cache/market-apy -- nothing here is used
// for any on-chain call.
//
// This vault is indexed under Morpho's newer vaultV2ByAddress query,
// not the classic vaultByAddress/vaults(where:...) schema -- the first
// attempt at this (2026-09-24) queried the classic schema, got an
// empty result, and wrongly concluded Morpho's API didn't index vaults
// on this chain at all. It does; it's just the other query. Verified
// live: vaultV2ByAddress returns this exact vault (name "Steakhouse
// USDG", symbol "steakUSDG", asset = our real USDG address) with a
// real apy field, not a guess reconstructed from allocation data.
const MORPHO_GRAPHQL_URL = "https://blue-api.morpho.org/graphql";
const ROBINHOOD_CHAIN_ID = 4663;

export const revalidate = 60;

export async function GET() {
  const vaultAddress = process.env.NEXT_PUBLIC_CACHE_VAULT_MORPHO_ADDRESS || "0xBeEff033F34C046626B8D0A041844C5d1A5409dd";

  try {
    const res = await fetch(MORPHO_GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `query V($address: String!, $chainId: Int!) {
          vaultV2ByAddress(address: $address, chainId: $chainId) {
            apy
            netApy
            totalAssetsUsd
          }
        }`,
        variables: { address: vaultAddress, chainId: ROBINHOOD_CHAIN_ID },
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
    if (!json.data?.vaultV2ByAddress) {
      return Response.json({ error: "Vault not found on Morpho's API" }, { status: 404 });
    }

    const { apy, netApy, totalAssetsUsd } = json.data.vaultV2ByAddress;
    return Response.json({ apy, netApy, totalAssetsUsd, updatedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to fetch vault rate" }, { status: 502 });
  }
}
