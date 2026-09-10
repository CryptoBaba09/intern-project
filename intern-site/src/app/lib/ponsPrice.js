import { createPublicClient, http, parseAbi } from "viem";
import { robinhoodChain, CONTRACTS } from "./chain";

// Real replacement for the dead pair.fund price API (see the "BROKEN as
// of 2026-09-10" comments in api/blaze/topup, api/promptly/topup,
// api/promptly/price). Pons publishes no public REST API for this --
// docs.ponsfamily.com/v2's own Integration section computes price
// straight from the curve's reserves, so that's what this does too,
// verified against that doc's own formula rather than guessed:
//
//   const price = Number(quoteReserve) / Number(tokenReserve);
//
// quoteReserve already includes the phantom (virtual) reserve, so this
// is the marginal price a very small buy would pay -- a spot rate for
// display/valuation, not an execution quote for an actual trade (a real
// buy/sell moves along the curve and pays fees on top; see
// docs.ponsfamily.com/v2's "Getting a quote" section for that fuller
// math). For valuing an *already-completed* burn -- which is all
// blaze/promptly's topup routes need -- the spot rate is the right
// number: there's no trade being executed here to slip against.
const FACTORY_ADDRESS = "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e";

const FACTORY_ABI = parseAbi([
  "function getLaunchedToken(address token) view returns ((address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists) launch)",
]);

const CURVE_ABI = parseAbi([
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
]);

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

// ETH/USD from DeFiLlama's public coins API -- the same source
// docs.ponsfamily.com/v2 names as what Pons's own interface uses
// ("ethUsd from any ETH oracle. The pons interface uses DeFiLlama.").
async function fetchEthUsd() {
  const res = await fetch(
    "https://coins.llama.fi/prices/current/coingecko:ethereum",
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`DeFiLlama ETH price API returned ${res.status}`);
  const data = await res.json();
  const price = data?.coins?.["coingecko:ethereum"]?.price;
  if (!price || !Number.isFinite(price)) throw new Error("No live ETH/USD price available");
  return price;
}

// Only handles the pre-graduation (phase 0) case, which is where
// $INTERN v2 is right now (see docs.ponsfamily.com/v2's "Phases"
// table). Once it graduates (phase 2, PoolCreated), pricing moves to
// the real Uniswap v4 pool's slot0 -- deliberately NOT implemented here
// yet, since that's a different, untested code path this hasn't been
// run against. Throws clearly instead of silently returning a wrong
// number if that day arrives before this gets updated.
export async function fetchInternPriceUsd() {
  const { launch } = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getLaunchedToken",
    args: [CONTRACTS.internToken],
  });

  if (!launch.exists) {
    throw new Error("$INTERN isn't a recognized Pons launch at this address.");
  }
  if (launch.phase !== 0) {
    throw new Error(
      `$INTERN has graduated (phase ${launch.phase}) -- this helper only prices the pre-graduation curve. Needs a Uniswap v4 slot0 read added before it can price a graduated launch.`
    );
  }

  const [reserves, ethUsd] = await Promise.all([
    publicClient.readContract({
      address: launch.curve,
      abi: CURVE_ABI,
      functionName: "getReserves",
    }),
    fetchEthUsd(),
  ]);
  const [quoteReserve, tokenReserve] = reserves;
  if (tokenReserve === 0n) throw new Error("Curve has no token reserve to price against.");

  const priceEth = Number(quoteReserve) / Number(tokenReserve);
  return priceEth * ethUsd;
}
