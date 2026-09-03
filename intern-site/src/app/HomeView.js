"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ParticleField from "./components/ParticleField";
import BuyCta from "./components/BuyCta";
import { formatNumber } from "./lib/format";

const LAUNCH_SUPPLY = 100_000_000;

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 max-w-6xl mx-auto w-full">
      <ParticleField className="absolute inset-0 w-full h-full opacity-60" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
        }}
        className="relative max-w-xl"
      >
        {[
          <p
            key="eyebrow"
            className="font-mono text-xs text-[#00C805] tracking-widest mb-4"
          >
            ROBINHOOD CHAIN · PAIR · QUOTED IN BE
          </p>,
          <h1
            key="h1"
            className="text-5xl sm:text-6xl font-semibold leading-[1.05] mb-6"
          >
            Interns run on power.
            <br />
            <span className="text-[#D9A441] ember-glow">Supply</span> runs down.
          </h1>,
          <p key="p" className="text-[#9BA1A6] text-lg leading-relaxed mb-8">
            Every AI agent needs real compute, and real compute needs real
            power. $INTERN is quoted directly against tokenized Bloom Energy
            (BE) — the fuel-cell company behind a growing share of AI data
            center power. Every intern hired burns $INTERN on the spot.
            Fixed supply. No mint function, ever.
          </p>,
        ].map((el, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {el}
          </motion.div>
        ))}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-4 font-mono text-xs text-[#9BA1A6]"
        >
          <div>
            <p className="text-[#EDEEF0] text-sm">{formatNumber(LAUNCH_SUPPLY)}</p>
            <p>STARTING SUPPLY</p>
          </div>
          <div className="w-px bg-[#1B1D1B]" />
          <div>
            <p className="text-[#EDEEF0] text-sm">10,000</p>
            <p>$INTERN PER DEPLOY</p>
          </div>
          <div className="w-px bg-[#1B1D1B]" />
          <div>
            <p className="text-[#EDEEF0] text-sm">0%</p>
            <p>MINT FUNCTION</p>
          </div>
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <BuyCta />
      </motion.div>
    </section>
  );
}

function QuickLinks() {
  const links = [
    {
      href: "/tokenomics",
      title: "Tokenomics",
      body: "Fixed supply, the fee split, and exactly what's live on-chain today vs. what's coming.",
    },
    {
      href: "/stake",
      title: "Stake",
      body: "Stake $INTERN to earn a time-weighted share of BE from every creator fee claim.",
    },
    {
      href: "/roadmap",
      title: "Roadmap",
      body: "Everything $INTERN is built to do — live today, in progress, and what's next.",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <div className="grid sm:grid-cols-3 gap-6">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="group">
            <motion.div
              whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="border border-[#1B1D1B] p-6 h-full"
            >
              <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                {l.title}
                <span className="text-[#00C805] opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </h3>
              <p className="text-sm text-[#9BA1A6] leading-relaxed">{l.body}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomeView() {
  return (
    <>
      <Hero />
      <QuickLinks />
    </>
  );
}
