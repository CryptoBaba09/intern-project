"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { isTradingLive } from "../lib/chain";
import { PONS_TRADE_URL } from "../lib/pools";

// v2 $INTERN trades on Pons, paired against ETH on Robinhood Chain --
// see trade/TradeView.js for why this links out instead of running an
// in-house swap widget (bonding curve pre-graduation, not a locked V4
// pool we can call directly).
export default function BuyCta() {
  const isLive = isTradingLive();

  return (
    <motion.div
      whileHover={isLive ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="w-full max-w-md border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6 shadow-[0_0_0_rgba(0,200,5,0)] hover:shadow-[0_8px_40px_-8px_rgba(0,200,5,0.18)] transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
          TRADE $INTERN
        </span>
        <span className="font-mono text-xs text-[var(--color-accent)]">
          {isLive ? "LIVE ON PONS" : "NOT LIVE YET"}
        </span>
      </div>

      <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-5">
        $INTERN trades on Robinhood Chain against ETH — fixed supply, no
        mint function, live on Pons.
      </p>

      {isLive ? (
        <div className="flex flex-col gap-2">
          <a
            href={PONS_TRADE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            TRADE ON PONS ↗
          </a>
          <Link
            href="/trade"
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-[var(--color-line)] text-[var(--color-muted)] font-mono text-sm font-medium py-3 hover:border-[var(--color-accent)]/50 hover:text-[var(--color-fg)] transition-colors"
          >
            VERIFY THE CONTRACT FIRST
          </Link>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-[var(--color-line)] text-[var(--color-muted-2)] font-mono text-sm font-medium py-3 text-center">
          TRADING OPENS AT LAUNCH
        </div>
      )}

      <p className="mt-4 font-mono text-[10px] text-[var(--color-muted-2)] leading-relaxed">
        Always verify the contract address on Blockscout before
        connecting a wallet.
      </p>
    </motion.div>
  );
}
