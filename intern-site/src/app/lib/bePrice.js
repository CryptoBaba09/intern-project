import { createPublicClient, http, parseUnits, encodePacked } from "viem";
import { robinhoodChain, CONTRACTS, QUOTER_V2_ADDRESS, BE_USDG_FEE } from "./chain";
import { QUOTER_V2_ABI } from "./abis";

// Real BE/USD spot price via the same Uniswap V3 QuoterV2 deployment
// RewardChoicePreview.js already trusts for BE -> stock-token quotes
// (see chain.js's own comment on QUOTER_V2_ADDRESS/BE_USDG_FEE -- a
// real BE/USDG pool, confirmed live). USDG is treated as $1 -- the same
// assumption RewardChoicePreview.js already makes implicitly (it never
// applies a USDG/USD conversion factor to a quoted amount), not a new
// one introduced here.
const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

export async function fetchBePriceUsd() {
  const oneBe = parseUnits("1", 18);
  const [usdgOut] = await publicClient.readContract({
    address: QUOTER_V2_ADDRESS,
    abi: QUOTER_V2_ABI,
    functionName: "quoteExactInput",
    args: [encodeBeToUsdgPath(), oneBe],
  });
  // usdgOut is a raw USDG amount -- USDG's real decimals() is 6, not
  // 18 (see CONTRACTS.usdgDecimals's own comment). Dividing by 1e18
  // here made this come back ~10^12 too small, which fed straight into
  // /api/stake/apy's real APR calculation -- the Stake page's "LIVE
  // STAKING APR" has been wrong since this was written, not because of
  // genuinely low activity.
  return Number(usdgOut) / 10 ** CONTRACTS.usdgDecimals;
}

function encodeBeToUsdgPath() {
  // Single-hop BE -> USDG, same encodePacked shape RewardChoicePreview
  // uses for its longer BE -> USDG -> target path, just stopping one
  // hop earlier since USDG itself is the price this needs.
  return encodePacked(
    ["address", "uint24", "address"],
    [CONTRACTS.beToken, BE_USDG_FEE, CONTRACTS.usdgToken]
  );
}
