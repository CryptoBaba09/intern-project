"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PAIR_POOL_URL, isTradingLive } from "../lib/chain";

// Trading now has two doors that hit the exact same locked liquidity:
// /trade calls PAIR's own public PairV5MultiPoolAggregator contract
// directly from this site (see lib/pools.js + trade/TradeView.js), and
// pair.fund is the other, PAIR-hosted door onto the same pools. Neither
// custodies funds or adds its own liquidity -- this is not a competing
// swap implementation, it's the same router with our own front end on it.
export default function BuyCta() {
  const isLive = isTradingLive();

  return (
    <motion.div
      whileHover={isLive ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="w-full max-w-md border border-[#1B1D1B] rounded-2xl bg-[#0F1113] p-6 shadow-[0_0_0_rgba(0,200,5,0)] hover:shadow-[0_8px_40px_-8px_rgba(0,200,5,0.18)] transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-[#9BA1A6] tracking-wide">
          TRADE $INTERN
        </span>
        <span className="font-mono text-xs text-[#00C805]">
          {isLive ? "LIVE ON PAIR" : "LOCKED LIQUIDITY"}
        </span>
      </div>

      <p className="text-sm text-[#9BA1A6] leading-relaxed mb-5">
        $INTERN trades on Robinhood Chain against BE and USDG —
        permanently locked liquidity from block one, no bonding curve, no
        migration.
      </p>

      {isLive ? (
        <div className="flex flex-col gap-2">
          <Link
            href="/trade"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium py-3 hover:bg-[#00b304] transition-colors"
          >
            BUY / SELL HERE
          </Link>
          {PAIR_POOL_URL && (
            <a
              href={PAIR_POOL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#1B1D1B] text-[#9BA1A6] font-mono text-sm font-medium py-3 hover:border-[#00C805]/50 hover:text-[#EDEEF0] transition-colors"
            >
              OR TRADE ON PAIR ↗
            </a>
          )}
        </div>
      ) : (
        <div className="w-full rounded-xl border border-[#1B1D1B] text-[#4A4F54] font-mono text-sm font-medium py-3 text-center">
          TRADING OPENS AT LAUNCH
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] text-[#4A4F54] leading-relaxed">
        Both trade against the same locked pools. Always verify the
        contract address on Blockscout before connecting a wallet.
      </p>
    </motion.div>
  );
}
