"use client";

import { useEffect, useState } from "react";

// Placeholder starting point for the live burn count.
// Once the PAIR launch is live and the marketplace ships, wire this to a
// real totalSupply() read against Robinhood Chain instead of local state.
const LAUNCH_SUPPLY = 100_000_000;

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

function Nav() {
  return (
    <nav className="w-full border-b border-[#1B1D1B] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#00C805] ember-pulse" />
        <span className="font-mono text-sm tracking-widest text-[#EDEEF0]">
          $INTERN
        </span>
      </div>
      <div className="flex items-center gap-6 font-mono text-xs text-[#9BA1A6]">
        <a href="#tokenomics" className="hover:text-[#EDEEF0] transition-colors">
          TOKENOMICS
        </a>
        <a href="#burn" className="hover:text-[#EDEEF0] transition-colors">
          BURN
        </a>
        <a
          href="https://robinhoodchain.blockscout.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#EDEEF0] transition-colors"
        >
          CONTRACT ↗
        </a>
        <a
          href="https://x.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#EDEEF0] transition-colors"
        >
          X ↗
        </a>
      </div>
    </nav>
  );
}

function SwapWidget() {
  const [fromAmount, setFromAmount] = useState("");

  return (
    <div className="w-full max-w-md border border-[#1B1D1B] rounded-2xl bg-[#0F1113] p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-xs text-[#9BA1A6] tracking-wide">
          BUY ON PAIR
        </span>
        <span className="font-mono text-xs text-[#00C805]">LOCKED LIQUIDITY</span>
      </div>

      <div className="space-y-2">
        <div className="rounded-xl bg-[#0B0C0B] border border-[#1B1D1B] p-4 flex items-center justify-between">
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

      <button
        className="w-full mt-4 rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium py-3 hover:bg-[#00b304] transition-colors"
        disabled
      >
        CONNECT WALLET
      </button>

      <p className="mt-3 font-mono text-[10px] text-[#4A4F54] leading-relaxed">
        $INTERN trades on PAIR on Robinhood Chain, quoted directly in
        tokenized Bloom Energy (BE) stock — permanently locked liquidity
        from block one, no bonding curve, no migration.
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section className="px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 max-w-6xl mx-auto w-full">
      <div className="max-w-xl">
        <p className="font-mono text-xs text-[#00C805] tracking-widest mb-4">
          ROBINHOOD CHAIN · LAUNCHED ON PAIR · QUOTED IN BE
        </p>
        <h1 className="text-5xl sm:text-6xl font-semibold leading-[1.05] mb-6">
          Interns run on power.
          <br />
          <span className="text-[#D9A441] ember-glow">Supply</span> runs down.
        </h1>
        <p className="text-[#9BA1A6] text-lg leading-relaxed mb-8">
          Every AI agent needs real compute, and real compute needs real
          power. $INTERN is quoted directly against tokenized Bloom Energy
          (BE) — the fuel-cell company behind a growing share of AI data
          center power. Every intern hired burns $INTERN on the spot.
          Fixed supply. No mint function, ever.
        </p>
        <div className="flex gap-4 font-mono text-xs text-[#9BA1A6]">
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
        </div>
      </div>
      <SwapWidget />
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
      <p className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        TOKENOMICS
      </p>
      <h2 className="text-3xl font-semibold mb-8">What's actually on-chain</h2>
      <div className="border border-[#1B1D1B] border-collapse overflow-hidden">
        {rows.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-6 px-6 py-4 font-mono text-sm ${
              i !== rows.length - 1 ? "border-b border-[#1B1D1B]" : ""
            }`}
          >
            <span className="text-[#9BA1A6] shrink-0">{label}</span>
            <span className="text-[#EDEEF0] text-right">{value}</span>
          </div>
        ))}
      </div>
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
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-xs text-[#D9A441] tracking-widest mb-4">
          LIVE SUPPLY · UPDATES ON EVERY INTERN DEPLOYED
        </p>
        <p className="font-mono text-6xl sm:text-7xl font-bold text-[#D9A441] ember-glow tabular-nums">
          {formatNumber(supply)}
        </p>
        <p className="font-mono text-sm text-[#9BA1A6] mt-4">
          {formatNumber(burned)} INTERN burned so far ({pctBurned}%)
        </p>
        <p className="font-mono text-[10px] text-[#4A4F54] mt-6 max-w-md mx-auto leading-relaxed">
          This counter is illustrative until the marketplace is live. Once
          it ships, it reads real burn transactions from Robinhood Chain —
          nothing here will be self-reported.
        </p>
      </div>
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
      <p className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        MECHANICS
      </p>
      <h2 className="text-3xl font-semibold mb-10">How the burn works</h2>
      <div className="grid sm:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div key={s.n} className="border border-[#1B1D1B] p-6">
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
          </div>
        ))}
      </div>
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
      <p className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        PROTOCOL
      </p>
      <h2 className="text-3xl font-semibold mb-2">
        More than a token to trade
      </h2>
      <p className="text-[#9BA1A6] text-base leading-relaxed max-w-2xl mb-10">
        $INTERN is the settlement layer for a growing set of things you can
        do with it — starting with hiring an AI agent, and going from there.
      </p>
      <div className="grid sm:grid-cols-2 gap-px bg-[#1B1D1B] border border-[#1B1D1B]">
        {items.map((item) => (
          <div key={item.title} className="bg-[#0B0C0B] p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium">{item.title}</h3>
              <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5 shrink-0 ml-3">
                {item.status}
              </span>
            </div>
            <p className="text-sm text-[#9BA1A6] leading-relaxed">
              {item.body}
            </p>
          </div>
        ))}
      </div>
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
