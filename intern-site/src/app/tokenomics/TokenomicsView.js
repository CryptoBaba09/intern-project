"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedNumber from "../components/AnimatedNumber";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { formatNumber } from "../lib/format";

const LAUNCH_SUPPLY = 100_000_000;

function Tokenomics() {
  const rows = [
    ["Total supply", "Fixed at 100,000,000 $INTERN at launch on PAIR — no supply customization, no minting"],
    ["Pairing asset", "$INTERN trades directly against Bloom Energy (BE), a tokenized real-world stock — priced in BE, not routed through ETH first"],
    ["Liquidity", "Locked forever in a Uniswap v4 pool from day one — no bonding curve, no migration to a separate pool later"],
    ["Marketplace deploy fee", "10,000 $INTERN burned every time an intern is deployed from the marketplace"],
    ["Swap fee", "PAIR's standard protocol fee only — $INTERN adds no extra trading tax on top"],
    ["Creator fee split", "70% buy-and-burn · 20% streamed to staked $INTERN · 10% treasury — see the breakdown below"],
    ["Mint function", "None, ever — total supply only ever goes down"],
  ];

  return (
    <section id="tokenomics" className="px-6 pt-16 pb-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        TOKENOMICS
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-2">
        What&apos;s actually on-chain
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[#9BA1A6] text-base leading-relaxed max-w-2xl mb-10"
      >
        No off-chain promises — every number below is either enforced by a
        contract today or clearly marked as not live yet.
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="border border-[#1B1D1B] border-collapse overflow-hidden"
      >
        {rows.map(([label, value], i) => (
          <motion.div
            key={label}
            variants={fadeUp}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-6 px-6 py-4 font-mono text-sm transition-colors hover:bg-white/[0.03] ${
              i !== rows.length - 1 ? "border-b border-[#1B1D1B]" : ""
            }`}
          >
            <span className="text-[#9BA1A6] shrink-0">{label}</span>
            <span className="text-[#EDEEF0] sm:text-right">{value}</span>
          </motion.div>
        ))}
      </motion.div>
      <FeeSplitBar />
    </section>
  );
}

function FeeSplitBar() {
  const segments = [
    {
      label: "BURN",
      pct: 70,
      color: "#00C805",
      note: "Swapped for $INTERN on the open market, then sent to the dead address",
    },
    {
      label: "DISTRIBUTION",
      pct: 20,
      color: "#D9A441",
      note: "Streamed in BE to everyone staking $INTERN, pro-rata and time-weighted",
    },
    {
      label: "TREASURY",
      pct: 10,
      color: "#9BA1A6",
      note: "Ops, marketing, and expansion — sent directly, no swap",
    },
  ];

  return (
    <Reveal delay={0.15} className="mt-6">
      <p className="font-mono text-xs text-[#4A4F54] tracking-widest mb-3">
        EVERY CREATOR FEE CLAIM, SPLIT ON-CHAIN
      </p>
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-[#0F1113] border border-[#1B1D1B]">
        {segments.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: `${s.pct}%`, backgroundColor: s.color, transformOrigin: "left" }}
          />
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-start gap-2.5">
            <span
              className="w-2 h-2 rounded-full mt-1 shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <div>
              <p className="font-mono text-xs text-[#EDEEF0] tracking-wide">
                {s.pct}% <span className="text-[#9BA1A6]">{s.label}</span>
              </p>
              <p className="text-xs text-[#9BA1A6] leading-relaxed mt-0.5">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-[#4A4F54] mt-5 leading-relaxed">
        Distributions require staking $INTERN — unstake any time, no
        lockup. This isn&apos;t a dividend, equity, or a guaranteed return;
        it&apos;s a share of on-chain protocol fees, paid only to $INTERN
        staked at the time.
      </p>
    </Reveal>
  );
}

function BurnTicker() {
  const [supply, setSupply] = useState(LAUNCH_SUPPLY);

  // Illustrative decrement only — replace with a real totalSupply() poll
  // against Robinhood Chain once the token and marketplace are live.
  useEffect(() => {
    const id = setInterval(() => {
      setSupply((s) => Math.max(s - Math.floor(Math.random() * 40), 0));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const burned = LAUNCH_SUPPLY - supply;
  const pctBurned = ((burned / LAUNCH_SUPPLY) * 100).toFixed(4);

  return (
    <section
      id="burn"
      className="px-6 py-24 border-y border-[#1B1D1B] bg-[#0F1113]"
    >
      <Reveal className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-xs text-[#D9A441] tracking-widest mb-4 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] ember-pulse" />
          LIVE SUPPLY · UPDATES ON EVERY INTERN DEPLOYED
        </p>
        <p className="font-mono text-6xl sm:text-7xl font-bold text-[#D9A441] ember-glow tabular-nums">
          <AnimatedNumber value={supply} />
        </p>
        <p className="font-mono text-sm text-[#9BA1A6] mt-4">
          {formatNumber(burned)} INTERN burned so far ({pctBurned}%)
        </p>
        <p className="font-mono text-[10px] text-[#4A4F54] mt-6 max-w-md mx-auto leading-relaxed">
          This counter is illustrative until the marketplace is live. Once
          it ships, it reads real burn transactions from Robinhood Chain —
          nothing here will be self-reported.
        </p>
      </Reveal>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "You hire an intern",
      body: "Start with the Market/Burn Tracker Intern — deploy it from the marketplace for a fixed $INTERN fee.",
      status: null,
    },
    {
      n: "02",
      title: "10,000 $INTERN burns",
      body: "The deploy fee is burned on the spot — sent to the dead address, gone forever. This is live today, not a promise.",
      status: null,
    },
    {
      n: "03",
      title: "Treasury buybacks",
      body: "Once trading fees fund it, treasury buybacks add a second burn layer on top of deploy fees.",
      status: "COMING SOON",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        MECHANICS
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
        How the burn works
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-3 gap-6"
      >
        {steps.map((s) => (
          <motion.div
            key={s.n}
            variants={fadeUp}
            whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="border border-[#1B1D1B] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-[#4A4F54]">{s.n}</p>
              {s.status && (
                <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5">
                  {s.status}
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium mb-2">{s.title}</h3>
            <p className="text-sm text-[#9BA1A6] leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default function TokenomicsView() {
  return (
    <>
      <Tokenomics />
      <BurnTicker />
      <HowItWorks />
    </>
  );
}
