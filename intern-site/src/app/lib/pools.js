import { getAddress } from "viem";

// v2 $INTERN, live on Pons (ponsfamily.com) -- a Robinhood Chain
// launchpad, paired against ETH. Migrated here 2026-09-10 after
// Pair.fund's trading route broke; see AnnouncementBar.js and
// burn-to-create/BurnToCreateView.js for that story.
//
// Unlike v1's PAIR launch, this isn't a locked Uniswap V4 pool we can
// call directly with a hardcoded PoolKey -- pre-graduation, v2 trades
// against Pons's own bonding curve contract, and only becomes a real
// Uniswap V4 pool once the curve raises 4.2 ETH (graduation). That
// curve's shape isn't the same interface as a V4 pool, so this site
// doesn't try to reimplement Pons's swap-execution contract here --
// /trade links out to Pons directly instead. See TradeView.js.
export const INTERN_ADDRESS = getAddress("0x1293a4a3f090c091c7da6dcca6a3ba9201b0e1c8");

export const PONS_TRADE_URL = `https://www.ponsfamily.com/launchpad/${INTERN_ADDRESS}`;
