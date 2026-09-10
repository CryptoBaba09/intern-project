"use client";

import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { INTERN_ADDRESS, PONS_TRADE_URL } from "../lib/pools";

// v2 $INTERN trades on Pons (ponsfamily.com), paired against ETH --
// not through an in-house swap widget calling a locked Uniswap V4 pool
// the way v1 did on PAIR. Two real reasons, not just "we didn't get to
// it yet":
//
// 1. Pre-graduation, Pons prices $INTERN off its own bonding curve
//    contract, not a V4 pool -- a different interface than the
//    PairV5MultiPoolAggregator this page used to call, and one that
//    changes shape again the moment the curve graduates (currently a
//    live, moving number -- see the live page linked below for it).
//    Building a custom swap widget against a contract that's about to
//    be replaced by a different one is work we'd redo almost
//    immediately.
// 2. Pons's own interface already does this correctly and audits its
//    own approvals/slippage/simulation -- there's no liquidity or
//    price advantage to routing through a second, unaudited widget of
//    our own on top of the same curve.
//
// Once $INTERN graduates into a real, permanent Uniswap V4 pool, an
// in-house widget becomes worth building again -- the same tradeoff
// v1's TradeView made, just correctly this time.
export default function TradeView() {
  return (
    <section className="px-6 pt-16 pb-24 max-w-2xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        TRADE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-4">
        Buy or sell $INTERN
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-base leading-relaxed max-w-xl mb-10"
      >
        Trades live on Pons, paired against ETH, on Robinhood Chain. We
        send you there instead of running our own swap widget — see why
        below.
      </Reveal>

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="border border-[var(--color-line)] rounded-2xl p-6 sm:p-8 bg-[var(--color-surface)]"
      >
        <motion.p variants={fadeUp} className="font-mono text-xs text-[var(--color-muted-2)] mb-4">
          {INTERN_ADDRESS}
        </motion.p>
        <motion.a
          variants={fadeUp}
          href={PONS_TRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3.5 hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          TRADE ON PONS ↗
        </motion.a>
      </motion.div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-8 leading-relaxed max-w-xl">
        Pre-graduation, $INTERN prices off Pons's bonding curve, not a
        locked pool — expect real price impact on larger trades, same as
        any brand-new launch. Verify the contract address above against{" "}
        <a
          href={`https://robinhoodchain.blockscout.com/token/${INTERN_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent)] hover:underline"
        >
          Blockscout
        </a>{" "}
        yourself before trading.
      </p>
    </section>
  );
}
