"use client";

import { useEffect, useState } from "react";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import InterndexWidget from "../components/InterndexWidget";
import {
  INTERN_ADDRESS,
  PONS_TRADE_URL,
  FOMO_TRADE_URL,
  GECKOTERMINAL_POOL_URL,
  GECKOTERMINAL_EMBED_URL,
} from "../lib/pools";

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
// $interndex (InterndexWidget, same live logic as /interndex) IS a
// real in-house swap now -- but it's a different product, a cross-
// chain funnel into $INTERN through a third-party aggregator, not a
// widget calling Pons's own bonding curve directly. That's why it's
// the featured, primary swap box on this page while Pons/FOMO stay
// the links for trading $INTERN directly against ETH on Robinhood
// Chain itself.
export default function TradeView() {
  const [chartLoaded, setChartLoaded] = useState(false);
  // A cross-origin iframe's own onLoad fires when ITS document loads --
  // measured live, that happens well before GeckoTerminal's internal JS
  // actually paints the chart (onLoad cleared the loading message with
  // several seconds of black box still left). No way to read a
  // cross-origin frame's real render state, so this uses a fixed timer
  // matching the measured real-world load time (8-13s) instead.
  //
  // DISCLOSED LIMITATION found the same day this timer shipped: GeckoTerminal
  // itself occasionally fails to render at all within the timer window (a
  // real-world load, screenshotted live) -- a third-party dependency this
  // site doesn't control. Rather than chase that with a longer timer, the
  // price stat below is now the page's PRIMARY content: it's read straight
  // from Pons's own on-chain reserves (see lib/ponsPrice.js), so the page is
  // useful even if the chart never renders. The chart becomes a secondary
  // element, not something the page's core value depends on.
  useEffect(() => {
    const id = setTimeout(() => setChartLoaded(true), 14000);
    return () => clearTimeout(id);
  }, []);

  const [priceUsd, setPriceUsd] = useState(null);
  const [priceError, setPriceError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/promptly/price");
        const data = await res.json();
        if (!cancelled) {
          if (typeof data.priceUsd === "number") setPriceUsd(data.priceUsd);
          else setPriceError(true);
        }
      } catch {
        if (!cancelled) setPriceError(true);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="px-6 pt-16 pb-24 max-w-6xl mx-auto w-full">
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
        Swap straight into $INTERN below — from Robinhood Chain,
        Ethereum, Arbitrum, or Base. Prefer trading $INTERN/ETH
        directly on Robinhood Chain instead? Pons and FOMO are further
        down.
      </Reveal>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="order-2 lg:order-1">
          {/* Read straight from Pons's own on-chain curve reserves (see
              lib/ponsPrice.js) -- not GeckoTerminal, not a cached API. */}
          <Reveal
            delay={0.15}
            className="border border-[var(--color-line)] rounded-2xl p-6 bg-[var(--color-surface)] mb-6 flex items-center justify-between gap-4"
          >
            <span className="font-mono text-xs text-[var(--color-muted)] tracking-widest">
              LIVE PRICE
            </span>
            <span className="font-mono text-2xl tabular-nums">
              {priceError
                ? "—"
                : priceUsd === null
                  ? "loading…"
                  : `$${priceUsd.toFixed(priceUsd < 0.01 ? 8 : 4)}`}
            </span>
          </Reveal>

          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="border border-[var(--color-line)] rounded-2xl overflow-hidden bg-[var(--color-surface)] mb-6"
          >
            {/* Live chart, embedded straight from GeckoTerminal -- Robinhood
                Chain isn't indexed on DexScreener (checked directly), but
                GeckoTerminal already lists this exact pool under Pons V2. */}
            {/* GeckoTerminal's own embed genuinely takes 8-13s to paint
                anything (measured via performance.getEntriesByType('resource')
                against the live iframe, both with and without loading="lazy" --
                lazy loading was never the cause of a "never loads" bug, an
                earlier pass here misread a network-inspection tool that simply
                can't see cross-origin iframe subresources). The real problem
                was a silent black box for 8+ seconds with zero feedback, which
                reads as broken even though it isn't. Fixed with a loading
                state below instead of touching the iframe itself. */}
            <div className="relative">
              {!chartLoaded && (
                <div className="absolute inset-0 flex flex-col bg-[var(--color-surface)] overflow-hidden">
                  {/* A skeleton silhouette shaped roughly like a real price
                      chart (a rising line + faded area beneath it), not just
                      a blank rectangle -- reads as "your chart is drawing
                      itself in," not "this area is broken." */}
                  <div className="chart-shimmer absolute inset-0" />
                  <svg
                    className="absolute inset-0 w-full h-full opacity-[0.14]"
                    viewBox="0 0 400 200"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <polyline
                      points="0,150 40,140 80,155 120,110 160,120 200,80 240,95 280,60 320,70 360,35 400,45"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2"
                    />
                    <polygon
                      points="0,150 40,140 80,155 120,110 160,120 200,80 240,95 280,60 320,70 360,35 400,45 400,200 0,200"
                      fill="var(--color-accent)"
                    />
                  </svg>
                  <div className="relative flex-1 flex flex-col items-center justify-center gap-3">
                    <p className="font-mono text-xs text-[var(--color-muted-2)] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ember-pulse" />
                      LOADING LIVE CHART…
                    </p>
                    {/* Visible immediately, not just after the timer -- no way to
                        detect from here whether this genuinely resolves on any
                        given load (see the disclosed limitation above), so the
                        escape hatch is available the whole time, not gated behind
                        a wait. */}
                    <a
                      href={GECKOTERMINAL_POOL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[var(--color-accent)] hover:underline"
                    >
                      Taking a while? Open the chart directly ↗
                    </a>
                  </div>
                </div>
              )}
              <iframe
                height="450"
                width="100%"
                title="INTERN/WETH live chart on GeckoTerminal"
                src={GECKOTERMINAL_EMBED_URL}
                frameBorder="0"
                allow="clipboard-write"
                className="block w-full"
              />
            </div>
            <p className="font-mono text-[10px] text-[var(--color-muted-2)] px-4 py-2 border-t border-[var(--color-line)]">
              Live chart via{" "}
              <a
                href={GECKOTERMINAL_POOL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:underline"
              >
                GeckoTerminal ↗
              </a>{" "}
              — not loading? Open it directly there instead.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="border border-[var(--color-line)] rounded-2xl p-6 sm:p-8 bg-[var(--color-surface)]"
          >
            <motion.p variants={fadeUp} className="font-mono text-xs text-[var(--color-muted-2)] mb-2">
              PREFER $INTERN/ETH DIRECTLY ON ROBINHOOD CHAIN?
            </motion.p>
            <motion.p variants={fadeUp} className="font-mono text-xs text-[var(--color-muted-2)] mb-4">
              {INTERN_ADDRESS}
            </motion.p>
            <div className="flex flex-wrap gap-3">
              <motion.a
                variants={fadeUp}
                href={PONS_TRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3.5 hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                TRADE ON PONS ↗
              </motion.a>
              <motion.a
                variants={fadeUp}
                href={FOMO_TRADE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3.5 hover:bg-[var(--color-surface)] transition-colors"
              >
                TRADE ON FOMO ↗
              </motion.a>
            </div>
          </motion.div>

          <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-8 leading-relaxed max-w-xl">
            Pre-graduation, $INTERN prices off Pons&apos;s bonding curve, not a
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
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-24">
          <Reveal>
            <InterndexWidget />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
