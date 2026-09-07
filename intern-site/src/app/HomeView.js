"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import ParticleField from "./components/ParticleField";
import BuyCta from "./components/BuyCta";
import Mascot from "./components/Mascot";
import { Reveal, fadeUp, staggerContainer } from "./components/motion";
import { formatNumber } from "./lib/format";

const LAUNCH_SUPPLY = 1_000_000_000;

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24 max-w-6xl mx-auto w-full">
      <ParticleField className="absolute inset-0 w-full h-full opacity-60" />

      <div className="relative flex flex-col lg:flex-row items-center gap-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
          }}
          className="max-w-xl"
        >
          {[
            <p
              key="eyebrow"
              className="font-mono text-xs text-[#00C805] tracking-widest mb-4"
            >
              ROBINHOOD CHAIN · PAIR · QUOTED IN BE + USDG
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
            className="flex flex-wrap gap-4 mb-10"
          >
            <a
              href="#trade"
              className="inline-flex items-center gap-2 rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium px-6 py-3 hover:bg-[#00b304] transition-colors"
            >
              TRADE $INTERN →
            </a>
            <Link
              href="/stake"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium px-6 py-3 hover:border-[#00C805]/50 transition-colors"
            >
              STAKE FOR BE
            </Link>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex gap-4 font-mono text-xs text-[#9BA1A6]"
          >
            <div>
              <p className="text-[#EDEEF0] text-sm">{formatNumber(LAUNCH_SUPPLY)}</p>
              <p>FIXED SUPPLY</p>
            </div>
            <div className="w-px bg-[#1B1D1B]" />
            <div>
              <p className="text-[#EDEEF0] text-sm">70/20/10</p>
              <p>BURN / STAKE / TREASURY</p>
            </div>
            <div className="w-px bg-[#1B1D1B]" />
            <div>
              <p className="text-[#EDEEF0] text-sm">0%</p>
              <p>MINT FUNCTION</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative shrink-0 w-56 sm:w-72"
        >
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative drop-shadow-[0_20px_50px_rgba(0,200,5,0.22)]"
          >
            <Mascot className="w-full h-full" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        id="trade"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-16 max-w-md"
      >
        <BuyCta />
      </motion.div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    "1,000,000,000 FIXED SUPPLY",
    "LIQUIDITY LOCKED FOREVER",
    "TWO INTERNAL SECURITY REVIEWS",
    "OPEN-SOURCE CONTRACTS ON GITHUB",
  ];
  return (
    <section className="px-6 py-8 border-y border-[#1B1D1B] bg-[#0F1113]">
      <div className="max-w-6xl mx-auto w-full flex flex-wrap justify-center gap-x-10 gap-y-3">
        {items.map((item) => (
          <span
            key={item}
            className="font-mono text-[11px] text-[#9BA1A6] tracking-wide flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C805]" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Trade generates fees",
      body: "Every trade on PAIR's locked $INTERN/BE and $INTERN/USDG pools pays a standard swap fee — no extra tax added.",
    },
    {
      n: "02",
      title: "Blaze claims and burns",
      body: "The protocol's always-on burn bot claims accumulated fees and burns 70% of them automatically. No deploy step, no vote, no button.",
    },
    {
      n: "03",
      title: "Stakers earn the rest",
      body: "20% streams to everyone staking $INTERN, pro-rata and time-weighted. 10% funds treasury — ops, growth, and what comes next.",
    },
  ];
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        THE MECHANIC
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl sm:text-4xl font-semibold mb-10 max-w-xl">
        Supply only goes down. That&apos;s the whole thesis.
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
            <p className="font-mono text-xs text-[#4A4F54] mb-4">{s.n}</p>
            <h3 className="text-lg font-medium mb-2">{s.title}</h3>
            <p className="text-sm text-[#9BA1A6] leading-relaxed">{s.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function MeetTheInterns() {
  const interns = [
    {
      name: "Blaze",
      role: "Burn Tracker",
      status: "LIVE",
      body: "The autonomous burn engine. Claims fees, buys back, burns — every cycle, no user action needed.",
    },
    {
      name: "Rendo",
      role: "Media Intern",
      status: "BETA LIVE",
      body: "Real text-generation beta, gated by your stake tier. Full AI video avatars still in design.",
    },
    {
      name: "Promptly",
      role: "Inference Intern",
      status: "IN DESIGN",
      body: "Routes real LLM inference credit to stakers — Claude, GPT, Gemini, and more.",
    },
  ];
  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
            THE MARKETPLACE
          </Reveal>
          <Reveal as="h2" delay={0.05} className="text-3xl sm:text-4xl font-semibold max-w-xl">
            Hire an intern. Burn some $INTERN.
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <Link
            href="/marketplace"
            className="font-mono text-sm text-[#00C805] hover:underline whitespace-nowrap"
          >
            SEE THE FULL ROSTER →
          </Link>
        </Reveal>
      </div>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-3 gap-6"
      >
        {interns.map((it) => (
          <motion.div
            key={it.name}
            variants={fadeUp}
            whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="border border-[#1B1D1B] p-6 bg-[#0F1113]"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold">{it.name}</h3>
              <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5 shrink-0">
                {it.status}
              </span>
            </div>
            <p className="font-mono text-xs text-[#D9A441] mb-3">{it.role}</p>
            <p className="text-sm text-[#9BA1A6] leading-relaxed">{it.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function QuickLinks() {
  const links = [
    {
      href: "/genesis",
      title: "Genesis NFTs",
      body: "500 Blaze-based NFTs, unlocked once $INTERN hits real trading volume. Mint, stake, burn.",
    },
    {
      href: "/tokenomics",
      title: "Tokenomics",
      body: "Fixed supply, the fee split, and exactly what's live on-chain today vs. what's coming.",
    },
    {
      href: "/roadmap",
      title: "Roadmap",
      body: "Everything $INTERN is built to do — live today, in progress, and what's next.",
    },
    {
      href: "/docs",
      title: "Docs",
      body: "Real contract addresses, real ABIs, no placeholders. Verify everything yourself.",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

function FinalCta() {
  return (
    <section className="px-6 pb-24 max-w-6xl mx-auto w-full">
      <Reveal className="border border-[#1B1D1B] rounded-2xl p-10 sm:p-14 bg-[#0F1113] text-center relative overflow-hidden">
        <div className="relative">
          <p className="font-mono text-xs text-[#D9A441] tracking-widest mb-4">
            READY WHEN YOU ARE
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold mb-6 max-w-2xl mx-auto">
            One token that runs on power, burns on use, and pays stakers real BE.
          </h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="#trade"
              className="inline-block rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium px-6 py-3 hover:bg-[#00b304] transition-colors"
            >
              TRADE $INTERN →
            </a>
            <Link
              href="/marketplace"
              className="inline-block rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium px-6 py-3 hover:border-[#00C805]/50 transition-colors"
            >
              MEET THE INTERNS →
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function HomeView() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <MeetTheInterns />
      <QuickLinks />
      <FinalCta />
    </>
  );
}
