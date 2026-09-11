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

// GeckoTerminal indexes Robinhood Chain (DexScreener does not -- checked
// 2026-09-11, "Token or Pair Not Found" there) and already has this pool
// listed under Pons V2, complete with the project description we've
// submitted there. Confirmed via GeckoTerminal's own "Embed Chart" share
// dialog rather than guessed -- info=1 and swaps=1 match that dialog's
// checked-by-default "Show Info"/"Show Swaps" options. This only shows
// a live chart in-page; it still isn't a swap widget, same reasoning as
// the rest of this file -- see TradeView.js for why we still send
// people to Pons itself to actually trade.
const GECKOTERMINAL_POOL_ADDRESS = "0x68da86af39b8d5347264d588f1ec6e8f31860400";
export const GECKOTERMINAL_POOL_URL = `https://www.geckoterminal.com/robinhood/pools/${GECKOTERMINAL_POOL_ADDRESS}`;
export const GECKOTERMINAL_EMBED_URL = `${GECKOTERMINAL_POOL_URL}?embed=1&info=1&swaps=1`;
