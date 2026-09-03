"use client";

import { motion } from "framer-motion";
import { PAIR_POOL_URL } from "../lib/chain";

// Trading itself lives on PAIR, not on this site -- PAIR already solves
// swap routing, slippage, and liquidity safely; duplicating that here
// would mean maintaining our own swap security surface for something
// PAIR does well already. This is a link out, not a widget.
export default function BuyCta() {
  const isLive = Boolean(PAIR_POOL_URL);

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
        $INTERN trades on PAIR on Robinhood Chain, quoted directly in
        tokenized Bloom Energy (BE) — permanently locked liquidity from
        block one, no bonding curve, no migration.
      </p>

      {isLive ? (
        <a
          href={PAIR_POOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium py-3 hover:bg-[#00b304] transition-colors"
        >
          TRADE ON PAIR ↗
        </a>
      ) : (
        <div className="w-full rounded-xl border border-[#1B1D1B] text-[#4A4F54] font-mono text-sm font-medium py-3 text-center">
          TRADING OPENS AT LAUNCH
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] text-[#4A4F54] leading-relaxed">
        Always verify you&apos;re on pair&apos;s real domain and the
        contract address on Blockscout before connecting a wallet to trade.
      </p>
    </motion.div>
  );
}
