"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import AnimatedNumber from "../components/AnimatedNumber";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { formatNumber } from "../lib/format";
import { CONTRACTS, DEAD_ADDRESS, isStakingLive, isTradingLive } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../lib/abis";

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

// Same real reads as Blaze's page / the homepage crew scene -- burned
// (dead-address balance) and staked (distributor.totalStaked()). Price
// comes from the already-live /api/promptly/price route (Pons curve
// reserves), fetched client-side here purely for display. Holder count
// has no real source yet -- see the NOT_AVAILABLE node below, which says
// so plainly rather than guessing.
function useSynapseStats() {
  const { data: burnedRaw } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [DEAD_ADDRESS],
    query: { enabled: isTradingLive(), refetchInterval: 15000 },
  });
  const { data: decimals } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: isTradingLive() },
  });
  const { data: totalStakedRaw } = useReadContract({
    address: CONTRACTS.distributor,
    abi: STAKING_REWARDS_ABI,
    functionName: "totalStaked",
    query: { enabled: isStakingLive(), refetchInterval: 15000 },
  });

  const [price, setPrice] = useState({ status: "loading", value: null });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/promptly/price");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || typeof data.priceUsd !== "number") {
          setPrice({ status: "error", value: null });
        } else {
          setPrice({ status: "ready", value: data.priceUsd });
        }
      } catch {
        if (!cancelled) setPrice({ status: "error", value: null });
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const burned = burnedRaw !== undefined ? Number(formatUnits(burnedRaw, decimals ?? 18)) : null;
  const staked = totalStakedRaw !== undefined ? Number(formatUnits(totalStakedRaw, decimals ?? 18)) : null;

  return { burned, staked, price };
}

// Node positions in a 600x420 viewBox -- center hub + 4 spokes, laid out
// by hand rather than computed, since there are only ever these four.
const POSITIONS = {
  hub: { x: 300, y: 210 },
  burned: { x: 300, y: 60 },
  staked: { x: 500, y: 210 },
  price: { x: 300, y: 360 },
  holders: { x: 100, y: 210 },
};

function Connectome({ nodes, activeId, onSelect }) {
  return (
    <svg viewBox="0 0 600 420" className="w-full max-w-xl mx-auto" aria-hidden={false} role="img">
      <title>Synapse's connectome of $INTERN activity</title>
      {nodes.map((node) => {
        const p1 = POSITIONS.hub;
        const p2 = POSITIONS[node.id];
        return (
          <motion.line
            key={`line-${node.id}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={activeId === node.id ? node.color : "var(--color-line)"}
            strokeWidth={activeId === node.id ? 2 : 1}
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: node.pulseOffset }}
          />
        );
      })}

      {/* Hub: Synapse itself */}
      <foreignObject x={POSITIONS.hub.x - 34} y={POSITIONS.hub.y - 34} width={68} height={68}>
        <div className="w-full h-full rounded-full ring-2 ring-[var(--color-accent)]/40 overflow-hidden">
          <Image src="/personas/synapse-icon.png" alt="Synapse" width={68} height={68} />
        </div>
      </foreignObject>

      {nodes.map((node) => {
        const p = POSITIONS[node.id];
        const isActive = activeId === node.id;
        return (
          <g
            key={node.id}
            transform={`translate(${p.x}, ${p.y})`}
            className="cursor-pointer"
            onClick={() => onSelect(node.id)}
          >
            <motion.circle
              r={isActive ? 30 : 26}
              fill="var(--color-surface)"
              stroke={isActive ? node.color : "var(--color-line)"}
              strokeWidth={isActive ? 2.5 : 1.5}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: node.pulseOffset }}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontFamily="monospace"
              fill={isActive ? node.color : "var(--color-muted)"}
              y="1"
            >
              {node.shortLabel}
            </text>
            <text textAnchor="middle" fontSize="12" fill="var(--color-fg)" y="46">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Read the chain",
      body: "Burned and staked totals come straight from balanceOf() and totalStaked() -- the same reads every other page on this site already uses, not a second copy.",
    },
    {
      n: "02",
      title: "Map it",
      body: "Synapse renders it as a connectome instead of a stat block -- same numbers, framed like the crew's own activity is a network worth mapping.",
    },
    {
      n: "03",
      title: "Grow the graph",
      body: "Holder distribution and per-persona activity need a real indexer this project doesn't have yet -- next nodes to add once that exists.",
    },
  ];
  return (
    <section className="px-6 py-20 border-t border-[var(--color-line)] max-w-5xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        HOW IT WORKS
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
        A real map, not a mockup.
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-3 gap-6"
      >
        {steps.map((step) => (
          <motion.div key={step.n} variants={fadeUp} className="border border-[var(--color-line)] p-6">
            <p className="font-mono text-xs text-[var(--color-muted-2)] mb-4">{step.n}</p>
            <h3 className="text-lg font-medium mb-2">{step.title}</h3>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">{step.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default function SynapseView() {
  const { burned, staked, price } = useSynapseStats();
  const [activeId, setActiveId] = useState(null);

  const nodes = [
    {
      id: "burned",
      shortLabel: "BURN",
      label: "Burned",
      color: "#00C805",
      pulseOffset: 0,
      status: burned !== null ? "LIVE" : "LOADING",
      detail:
        burned !== null
          ? { value: Math.round(burned), suffix: "$INTERN sent to the dead address, all-time." }
          : null,
      href: "/blaze",
      cta: "SEE BLAZE →",
    },
    {
      id: "staked",
      shortLabel: "STAKE",
      label: "Staked",
      color: "#3B82F6",
      pulseOffset: 0.5,
      status: staked !== null ? "LIVE" : "LOADING",
      detail:
        staked !== null
          ? { value: Math.round(staked), suffix: "$INTERN currently staked, earning BE." }
          : null,
      href: "/stake",
      cta: "GO STAKE →",
    },
    {
      id: "price",
      shortLabel: "PRICE",
      label: "Price",
      color: "#9B5DE5",
      pulseOffset: 1,
      status: price.status === "ready" ? "LIVE" : price.status === "error" ? "UNAVAILABLE" : "LOADING",
      detail:
        price.status === "ready"
          ? { text: `$${price.value.toFixed(10)} per $INTERN, from Pons's own curve reserves.` }
          : price.status === "error"
          ? { text: "Price read failed just now -- Pons's curve reserves weren't reachable. Not faked, just unavailable this refresh." }
          : null,
      href: "/trade",
      cta: "TRADE →",
    },
    {
      id: "holders",
      shortLabel: "N/A",
      label: "Holders",
      color: "var(--color-muted-2)",
      pulseOffset: 1.5,
      status: "NOT AVAILABLE",
      detail: {
        text: "There's no real source for this yet -- it needs an on-chain indexer this project hasn't built. Rather than guess, this node stays honestly empty until that exists.",
      },
      href: "/roadmap",
      cta: "SEE THE ROADMAP →",
    },
  ];

  const active = nodes.find((n) => n.id === activeId) ?? null;

  return (
    <>
      <section className="px-6 pt-16 pb-10 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-4 mb-6 flex-wrap">
          <Image
            src="/personas/synapse-icon.png"
            alt="Synapse icon"
            width={64}
            height={64}
            className="rounded-full border border-[var(--color-line)] w-14 h-14"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
              MEET SYNAPSE · RESEARCH INTERN
            </p>
            <LiveBadge>NEW</LiveBadge>
          </div>
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Maps the crew&apos;s own on-chain activity.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl"
        >
          Not a mascot with a gimmick — a real connectome of $INTERN&apos;s
          own numbers. Click a node below for the live value behind it, or
          the honest reason it&apos;s not there yet.
        </Reveal>
      </section>

      <section className="px-6 pb-10 max-w-4xl mx-auto w-full">
        <Reveal>
          <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6 sm:p-10">
            <Connectome nodes={nodes} activeId={activeId} onSelect={(id) => setActiveId((cur) => (cur === id ? null : id))} />

            <AnimatePresence mode="wait">
              {active && (
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-[var(--color-line)] mt-8 pt-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{active.label}</h3>
                        <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
                          {active.status}
                        </span>
                      </div>
                      {active.detail?.value !== undefined && (
                        <p className="font-mono text-2xl text-[var(--color-fg)] mb-1">
                          <AnimatedNumber value={active.detail.value} /> <span className="text-sm text-[var(--color-muted)]">{active.detail.suffix}</span>
                        </p>
                      )}
                      {active.detail?.text && (
                        <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-md">{active.detail.text}</p>
                      )}
                      {!active.detail && <p className="text-sm text-[var(--color-muted-2)]">Loading…</p>}
                    </div>
                    <Link
                      href={active.href}
                      className="shrink-0 inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-xs font-medium px-5 py-2.5 hover:border-[var(--color-accent)]/50 transition-colors whitespace-nowrap"
                    >
                      {active.cta}
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!active && (
              <p className="font-mono text-[11px] text-[var(--color-muted-2)] text-center mt-6">
                Tap a node to see the real number behind it.
              </p>
            )}
          </div>
        </Reveal>
      </section>

      <HowItWorks />

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-3">
            V1 CONNECTOME · MORE NODES PLANNED
          </p>
          <p className="text-[var(--color-fg)] text-lg mb-6 max-w-xl mx-auto">
            This is the real, working first version — not the full vision
            yet. Holder distribution and per-persona activity are next,
            once there&apos;s a real indexer to read them from.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/marketplace"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              MEET THE OTHER INTERNS →
            </Link>
            <Link
              href="/video-credits"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              GENERATE SYNAPSE VIDEO →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
