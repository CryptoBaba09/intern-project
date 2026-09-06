import { defineChain } from "viem";

// Confirmed live via eth_chainId against the public RPC (0x1237 = 4663).
// Runs Arbitrum Nitro under the hood. Native currency assumed ETH (the
// Nitro default) -- worth double-checking against official docs before
// launch if that turns out not to be the case.
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

// Addresses that only exist once $INTERN is actually live on PAIR and
// InternStakingRewards is deployed. Left unset (empty string) until then --
// every page that uses these checks for that and shows a "not live yet"
// state instead of calling contract methods against a garbage address.
export const CONTRACTS = {
  internToken: process.env.NEXT_PUBLIC_INTERN_TOKEN_ADDRESS || "",
  beToken: process.env.NEXT_PUBLIC_BE_TOKEN_ADDRESS || "",
  distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS || "",
  // PAIR protocol infrastructure, not $INTERN-specific -- same aggregator
  // and quoter every token on PAIR trades through. Addresses verified
  // against pair.fund/docs and Blockscout's verified source on 2026-09-07.
  aggregator:
    process.env.NEXT_PUBLIC_PAIR_AGGREGATOR_ADDRESS ||
    "0x9d7741776098aFA315e4D576ede4F2c67a21d8Ce",
  v4Quoter:
    process.env.NEXT_PUBLIC_PAIR_V4_QUOTER_ADDRESS ||
    "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94",
};

export const PAIR_POOL_URL = process.env.NEXT_PUBLIC_PAIR_POOL_URL || "";

// The burn bot sends $INTERN here via a plain transfer(), not a real
// burn() call -- so totalSupply() never moves and can't be used to
// measure burns. This dead address's own balance IS the real cumulative
// burn total. Matches DEAD_ADDRESS in intern-burn-bot/lib/config.js.
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export function isStakingLive() {
  return Boolean(CONTRACTS.internToken && CONTRACTS.distributor);
}

export function isTradingLive() {
  return Boolean(CONTRACTS.internToken);
}
