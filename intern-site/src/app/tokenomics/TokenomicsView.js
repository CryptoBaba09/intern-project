"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import AnimatedNumber from "../components/AnimatedNumber";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { formatNumber } from "../lib/format";
import { CONTRACTS, DEAD_ADDRESS, isTradingLive } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";

const LAUNCH_SUPPLY = 1_000_000_000;

function Tokenomics() {
  const rows = [
    ["Total supply", "Fixed at 1,000,000,000 $INTERN at launch on PAIR — no supply customization, no minting"],
    ["Pairing assets", "Two live pools: $INTERN/BE (Bloom Energy, a tokenized real-world stock) and $INTERN/USDG — priced directly in each, not routed through ETH first"],
    ["Liquidity", "Locked forever in Uniswap v4 pools from day one — no bonding curve, no migration to a separate pool later"],
    ["Custom intern deploy fee", "10,000 $INTERN burned once, when a user launches their own custom intern from the marketplace"],
    ["Swap fee", "PAIR's standard protocol fee only — $INTERN adds no extra trading tax on top"],
    ["Creator fee split", "70% buy-and-burn · 20% streamed to staked $INTERN · 10% treasury — see the breakdown below"],
    ["Mint function", "None, ever — total supply only ever goes down"],
  ];

  return (
    <section id="tokenomics" className="px-6 pt-16 pb-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        TOKENOMICS
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-2">
        What&apos;s actually on-chain
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-base leading-relaxed max-w-2xl mb-10"
      >
        No off-chain promises — every number below is either enforced by a
        contract today or clearly marked as not live yet.
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="border border-[var(--color-line)] border-collapse overflow-hidden"
      >
        {rows.map(([label, value], i) => (
          <motion.div
            key={label}
            variants={fadeUp}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-6 px-6 py-4 font-mono text-sm transition-colors hover:bg-white/[0.03] ${
              i !== rows.length - 1 ? "border-b border-[var(--color-line)]" : ""
            }`}
          >
            <span className="text-[var(--color-muted)] shrink-0">{label}</span>
            <span className="text-[var(--color-fg)] sm:text-right">{value}</span>
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
      color: "var(--color-accent)",
      note: "Swapped for $INTERN on the open market, then sent to the dead address",
    },
    {
      label: "DISTRIBUTION",
      pct: 20,
      color: "var(--color-ember)",
      note: "Streamed in BE to everyone staking $INTERN, pro-rata and time-weighted",
    },
    {
      label: "TREASURY",
      pct: 10,
      color: "var(--color-muted)",
      note: "Ops, marketing, and expansion — sent directly, no swap",
    },
  ];

  return (
    <Reveal delay={0.15} className="mt-6">
      <p className="font-mono text-xs text-[var(--color-muted-2)] tracking-widest mb-3">
        EVERY CREATOR FEE CLAIM, SPLIT ON-CHAIN
      </p>
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-[var(--color-surface)] border border-[var(--color-line)]">
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
              <p className="font-mono text-xs text-[var(--color-fg)] tracking-wide">
                {s.pct}% <span className="text-[var(--color-muted)]">{s.label}</span>
              </p>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed mt-0.5">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-5 leading-relaxed">
        Distributions require staking $INTERN — unstake any time, no
        lockup. This isn&apos;t a dividend, equity, or a guaranteed return;
        it&apos;s a share of on-chain protocol fees, paid only to $INTERN
        staked at the time.
      </p>
    </Reveal>
  );
}

function IllustrativeBurnTicker() {
  const [supply, setSupply] = useState(LAUNCH_SUPPLY);

  // Illustrative decrement only, shown pre-launch when there is no real
  // token contract to read from yet. Replaced by LiveBurnTicker's real
  // on-chain read the moment isTradingLive() is true.
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
      className="px-6 py-24 border-y border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <Reveal className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-xs text-[var(--color-ember)] tracking-widest mb-4 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ember)] ember-pulse" />
          SUPPLY PREVIEW
        </p>
        <p className="font-mono text-6xl sm:text-7xl font-bold text-[var(--color-ember)] ember-glow tabular-nums">
          <AnimatedNumber value={supply} />
        </p>
        <p className="font-mono text-sm text-[var(--color-muted)] mt-4">
          {formatNumber(burned)} INTERN burned so far ({pctBurned}%)
        </p>
        <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-6 max-w-md mx-auto leading-relaxed">
          This counter is illustrative — there is no live $INTERN contract
          to read yet. Once launched, this becomes a real on-chain read of
          the dead address's balance.
        </p>
      </Reveal>
    </section>
  );
}

// $INTERN's burn bot sends tokens to the standard dead address via a
// plain transfer(), not a real burn() call -- so totalSupply() never
// moves. The dead address's own balanceOf() IS the true cumulative burn
// total, read live and directly, with a link to verify it yourself.
function LiveBurnTicker() {
  const { data: burnedRaw, isLoading } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [DEAD_ADDRESS],
    query: { refetchInterval: 10000 },
  });
  const { data: decimals } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const burned = burnedRaw !== undefined ? Number(formatUnits(burnedRaw, decimals ?? 18)) : null;
  const supply = burned !== null ? LAUNCH_SUPPLY - burned : LAUNCH_SUPPLY;
  const pctBurned = burned !== null ? ((burned / LAUNCH_SUPPLY) * 100).toFixed(4) : "0.0000";

  return (
    <section
      id="burn"
      className="px-6 py-24 border-y border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <Reveal className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ember-pulse" />
          LIVE SUPPLY · READ DIRECTLY FROM THE DEAD ADDRESS
        </p>
        <p className="font-mono text-6xl sm:text-7xl font-bold text-[var(--color-ember)] ember-glow tabular-nums">
          {burned === null ? (isLoading ? "…" : formatNumber(supply)) : <AnimatedNumber value={Math.round(supply)} />}
        </p>
        <p className="font-mono text-sm text-[var(--color-muted)] mt-4">
          {burned === null ? "—" : formatNumber(Math.round(burned))} INTERN burned so far ({pctBurned}%)
        </p>
        <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-6 max-w-md mx-auto leading-relaxed">
          Not self-reported — this is {DEAD_ADDRESS}&apos;s real balance,
          refreshed every 10 seconds.{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/address/${DEAD_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            Verify on Blockscout ↗
          </a>
        </p>
      </Reveal>
    </section>
  );
}

function BurnTicker() {
  return isTradingLive() ? <LiveBurnTicker /> : <IllustrativeBurnTicker />;
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Every trade pays a fee",
      body: "PAIR's standard swap fee accrues on every $INTERN trade — no extra tax added on top.",
      status: null,
    },
    {
      n: "02",
      title: "Blaze claims and burns",
      body: "Blaze, the protocol's always-on burn bot, claims the accumulated fee and burns 70% of it automatically — no deploy step, no user action. This is live today, not a promise.",
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
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
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
            className="border border-[var(--color-line)] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-[var(--color-muted-2)]">{s.n}</p>
              {s.status && (
                <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
                  {s.status}
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium mb-2">{s.title}</h3>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">{s.body}</p>
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
