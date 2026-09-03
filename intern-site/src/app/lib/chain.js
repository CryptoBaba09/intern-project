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
};

export const PAIR_POOL_URL = process.env.NEXT_PUBLIC_PAIR_POOL_URL || "";

export function isStakingLive() {
  return Boolean(CONTRACTS.internToken && CONTRACTS.distributor);
}
