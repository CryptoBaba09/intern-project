"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import CursorGlow from "./components/CursorGlow";
import ParticleField from "./components/ParticleField";
import { Reveal, fadeUp, staggerContainer } from "./components/motion";

// Placeholder starting point for the live burn count.
// Once the PAIR launch is live and the marketplace ships, wire this to a
// real totalSupply() read against Robinhood Chain instead of local state.
const LAUNCH_SUPPLY = 100_000_000;

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

// Renders a MotionValue's text directly to the DOM (no React re-render per
// tick), spring-animated toward whatever `value` becomes.
function AnimatedNumber({ value }) {
  const spring = useSpring(value, { stiffness: 90, damping: 28, mass: 1 });
  const display = useTransform(spring, (v) => formatNumber(Math.round(v)));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

function NavLink({ href, children, external }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="relative pb-1 text-[#9BA1A6] transition-colors hover:text-[#EDEEF0] after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#00C805] after:transition-transform after:duration-300 hover:after:scale-x-100"
    >
      {children}
    </a>
  );
}

function Nav() {
  const { scrollY } = useScroll();
  const background = useTransform(
    scrollY,
    [0, 80],
    ["rgba(11,12,11,0)", "rgba(11,12,11,0.85)"]
  );
  const borderColor = useTransform(
    scrollY,
    [0, 80],
    ["rgba(27,29,27,0)", "rgba(27,29,27,1)"]
  );

  return (
    <motion.nav
      style={{ backgroundColor: background, borderColor }}
      className="sticky top-0 z-50 w-full border-b px-6 py-4 flex items-center justify-between backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00C805] ember-pulse" />
        <span className="font-mono text-sm tracking-widest text-[#EDEEF0]">
          $INTERN
        </span>
      </div>
      <div className="flex items-center gap-6 font-mono text-xs">
        <NavLink href="#tokenomics">TOKENOMICS</NavLink>
        <NavLink href="#burn">BURN</NavLink>
        <NavLink href="https://robinhoodchain.blockscout.com" external>
          CONTRACT ↗
        </NavLink>
        <NavLink href="https://x.com" external>
          X ↗
        </NavLink>
      </div>
    </motion.nav>
  );
}

function SwapWidget() {
  const [fromAmount, setFromAmount] = useState("");

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="w-full max-w-md border border-[#1B1D1B] rounded-2xl bg-[#0F1113] p-5 shadow-[0_0_0_rgba(0,200,5,0)] hover:shadow-[0_8px_40px_-8px_rgba(0,200,5,0.18)] transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-[#9BA1A6] tracking-wide">
          BUY ON PAIR
        </span>
        <span className="font-mono text-xs text-[#00C805]">LOCKED LIQUIDITY</span>
      </div>

      <div className="space-y-2">
        <div className="rounded-xl bg-[#0B0C0B] border border-[#1B1D1B] p-4 flex items-center justify-between focus-within:border-[#00C805]/50 transition-colors">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="bg-transparent font-mono text-xl outline-none w-2/3 placeholder-[#4A4F54]"
          />
          <span className="font-mono text-sm text-[#9BA1A6]">BE</span>
        </div>

        <div className="flex justify-center -my-1 relative z-10">
          <span className="w-8 h-8 rounded-full bg-[#0F1113] border border-[#1B1D1B] flex items-center justify-center text-[#00C805] text-sm">
            ↓
          </span>
        </div>

        <div className="rounded-xl bg-[#0B0C0B] border border-[#1B1D1B] p-4 flex items-center justify-between">
          <span className="font-mono text-xl text-[#4A4F54]">
            {fromAmount ? "—" : "0.0"}
          </span>
          <span className="font-mono text-sm text-[#00C805]">INTERN</span>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        className="w-full mt-4 rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium py-3 hover:bg-[#00b304] transition-colors disabled:opacity-100"
        disabled
      >
        CONNECT WALLET
      </motion.button>

      <p className="mt-3 font-mono text-[10px] text-[#4A4F54] leading-relaxed">
        $INTERN trades on PAIR on Robinhood Chain, quoted directly in
        tokenized Bloom Energy (BE) stock — permanently locked liquidity
        from block one, no bonding curve, no migration.
      </p>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 max-w-6xl mx-auto w-full">
      <ParticleField className="absolute inset-0 w-full h-full opacity-60" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="relative max-w-xl"
      >
        <motion.p
          variants={fadeUp}
          className="font-mono text-xs text-[#00C805] tracking-widest mb-4"
        >
          ROBINHOOD CHAIN · LAUNCHED ON PAIR · QUOTED IN BE
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl font-semibold leading-[1.05] mb-6"
        >
          Interns run on power.
          <br />
          <span className="text-[#D9A441] ember-glow">Supply</span> runs down.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-[#9BA1A6] text-lg leading-relaxed mb-8"
        >
          Every AI agent needs real compute, and real compute needs real
          power. $INTERN is quoted directly against tokenized Bloom Energy
          (BE) — the fuel-cell company behind a growing share of AI data
          center power. Every intern hired burns $INTERN on the spot.
          Fixed supply. No mint function, ever.
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="flex gap-4 font-mono text-xs text-[#9BA1A6]"
        >
          <div>
            <p className="text-[#EDEEF0] text-sm">{formatNumber(LAUNCH_SUPPLY)}</p>
            <p>STARTING SUPPLY</p>
          </div>
          <div className="w-px bg-[#1B1D1B]" />
          <div>
            <p className="text-[#EDEEF0] text-sm">100</p>
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
        <SwapWidget />
      </motion.div>
    </section>
  );
}

function Tokenomics() {
  const rows = [
    ["Total supply", "Fixed at launch on PAIR — no supply customization, no minting"],
    ["Pairing asset", "Tokenized Bloom Energy (BE) — quoted directly, no ETH leg"],
    ["Liquidity", "Permanently locked Uniswap v4 pool from block one — no bonding curve, no migration step"],
    ["Marketplace deploy fee", "100 $INTERN burned per intern deployed"],
    ["Swap fee", "PAIR's standard protocol fee only — no added creator trading tax"],
    ["Mint function", "None — supply only ever decreases"],
  ];

  return (
    <section id="tokenomics" className="px-6 py-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        TOKENOMICS
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-8">
        What&apos;s actually on-chain
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
            className={`flex items-center justify-between gap-6 px-6 py-4 font-mono text-sm transition-colors hover:bg-white/[0.03] ${
              i !== rows.length - 1 ? "border-b border-[#1B1D1B]" : ""
            }`}
          >
            <span className="text-[#9BA1A6] shrink-0">{label}</span>
            <span className="text-[#EDEEF0] text-right">{value}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
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
      title: "100 $INTERN burns",
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

function Protocol() {
  const items = [
    {
      title: "AI agents marketplace",
      body: "Deploy a template-based intern for a fixed $INTERN fee. Every deploy burns the fee on the spot. Launching with the Market/Burn Tracker Intern.",
      status: "LIVE AT LAUNCH",
    },
    {
      title: "Hold-to-earn tiers",
      body: "Hold $INTERN to earn a share of trading fees — as compute credits, or as a real BE stock dividend.",
      status: "COMING SOON",
    },
    {
      title: "Staked premium interns",
      body: "Stake more $INTERN to unlock more powerful, specialized intern templates.",
      status: "PLANNED",
    },
    {
      title: "Lending & borrowing",
      body: "Post $INTERN as collateral or borrow against it.",
      status: "PLANNED",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        PROTOCOL
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-2">
        More than a token to trade
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[#9BA1A6] text-base leading-relaxed max-w-2xl mb-10"
      >
        $INTERN is the settlement layer for a growing set of things you can
        do with it — starting with hiring an AI agent, and going from there.
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-2 gap-px bg-[#1B1D1B] border border-[#1B1D1B]"
      >
        {items.map((item) => (
          <motion.div
            key={item.title}
            variants={fadeUp}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            className="bg-[#0B0C0B] p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium">{item.title}</h3>
              <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5 shrink-0 ml-3">
                {item.status}
              </span>
            </div>
            <p className="text-sm text-[#9BA1A6] leading-relaxed">
              {item.body}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-[#1B1D1B] mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px] text-[#4A4F54]">
        <p className="max-w-md leading-relaxed">
          $INTERN is a fixed-supply utility token on Robinhood Chain, launched
          via PAIR and quoted against tokenized Bloom Energy (BE). This site
          is informational only and is not investment, financial, or legal
          advice. Verify the contract address on Blockscout before
          interacting with it.
        </p>
        <p>Built by Ponsfamily</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <CursorGlow />
      <Nav />
      <Hero />
      <Tokenomics />
      <BurnTicker />
      <HowItWorks />
      <Protocol />
      <Footer />
    </>
  );
}
