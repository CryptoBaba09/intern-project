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

// internToken defaults to the real, live v2 $INTERN address (migrated to
// Pons 2026-09-10) so the site is correct even if the env var override
// below is never set -- see lib/pools.js for why. distributor stays
// unset until InternStakingRewards is actually deployed for v2; every
// page using isStakingLive() checks for that and shows a "not live yet"
// state instead of calling contract methods against a garbage address.
//
// PAIR-specific trade infrastructure (aggregator/v4Quoter/beToken) is
// gone -- v2 doesn't trade through a locked Uniswap V4 pool we can call
// directly (see lib/pools.js), so there's nothing for those addresses
// to point at anymore. /trade links out to Pons instead of executing
// swaps in-house.
export const CONTRACTS = {
  internToken:
    process.env.NEXT_PUBLIC_INTERN_TOKEN_ADDRESS ||
    "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8",
  distributor: process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS || "",
};

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
