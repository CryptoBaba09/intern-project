"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import AnimatedNumber from "./AnimatedNumber";
import SpaceField from "./SpaceField";
import { formatNumber } from "../lib/format";
import { CONTRACTS, DEAD_ADDRESS, isStakingLive, isTradingLive } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../lib/abis";

// Shared "meet the crew" interactive scene, used on both the homepage
// (playful family framing) and /marketplace (roster framing) so the one
// real interaction — click an intern, see what they're actually up to —
// isn't built twice. Every stat shown is a live on-chain read, refetched
// whenever the page loads; nothing here is a fabricated per-persona
// number. Two real reads (burned, staked) get attributed to whichever
// intern the number is thematically about (Blaze = burn, Synapse =
// the staking network/"connectome") rather than inventing a fake split.
function useCrewStats() {
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

  const burned = burnedRaw !== undefined ? Number(formatUnits(burnedRaw, decimals ?? 18)) : null;
  const staked = totalStakedRaw !== undefined ? Number(formatUnits(totalStakedRaw, decimals ?? 18)) : null;
  return { burned, staked };
}

// Drifts gently in both axes -- not just a bob -- so each intern reads
// as weightless/floating rather than bouncing, matching the space
// backdrop behind them.
function CrewMember({ member, isActive, onSelect }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(member.id)}
      className="relative flex flex-col items-center gap-3 outline-none"
      animate={{ y: [0, -12, 0, 8, 0], x: [0, 5, 0, -5, 0] }}
      transition={{
        duration: 6 + member.floatOffset * 1.5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: member.floatOffset,
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
    >
      <div
        className={`relative rounded-full transition-all ${
          isActive ? "ring-2 ring-[var(--color-accent)]" : "ring-1 ring-white/20"
        }`}
        style={{
          boxShadow: isActive ? `0 0 32px ${member.glow}` : `0 0 20px ${member.glow}66`,
        }}
      >
        <Image
          src={member.icon}
          alt={`${member.name} icon`}
          width={84}
          height={84}
          className="rounded-full w-16 h-16 sm:w-20 sm:h-20 object-cover"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{member.name}</p>
        <p className="font-mono text-[10px] text-white/60 tracking-wide">{member.role}</p>
      </div>
    </motion.button>
  );
}

export default function InternFamilyScene({ title, subtitle, ctaHref, ctaLabel }) {
  const { burned, staked } = useCrewStats();
  const [activeId, setActiveId] = useState(null);

  const CREW = [
    {
      id: "blaze",
      name: "Blaze",
      role: "Burn Tracker",
      icon: "/personas/blaze-icon.png",
      glow: "#00C805",
      floatOffset: 0,
      status: "LIVE",
      blurb: "The autonomous burn engine — claims fees, buys back, burns. No user action needed.",
      stat:
        burned !== null
          ? { label: "$INTERN burned so far", value: burned }
          : null,
      href: "/blaze",
    },
    {
      id: "rendo",
      name: "Rendo",
      role: "Media Intern",
      icon: "/personas/rendo-icon.png",
      glow: "#F5A623",
      floatOffset: 0.4,
      status: "BETA LIVE",
      blurb: "Real text-generation beta, gated by your stake tier. Captions, post ideas, scripts.",
      stat: null,
      href: "/personas",
    },
    {
      id: "promptly",
      name: "Promptly",
      role: "Inference Intern",
      icon: "/personas/promptly-icon.png",
      glow: "#9B5DE5",
      floatOffset: 0.8,
      status: "TOP-UP LIVE",
      blurb: "Burn $INTERN at the live price for a real, spend-capped OpenRouter key.",
      stat: null,
      href: "/inference-credits",
    },
    {
      id: "synapse",
      name: "Synapse",
      role: "Research Intern",
      icon: "/personas/synapse-icon.png",
      glow: "#2DD4BF",
      floatOffset: 1.2,
      status: "NEW",
      blurb: "Maps the crew's own on-chain activity as a connectome. Dashboard in the works.",
      stat:
        staked !== null
          ? { label: "$INTERN staked right now", value: staked }
          : null,
      href: "/synapse",
    },
  ];

  const active = CREW.find((m) => m.id === activeId) ?? null;

  return (
    <div className="border border-[var(--color-line)] rounded-2xl overflow-hidden">
      <div className="relative overflow-hidden">
        <SpaceField className="absolute inset-0 w-full h-full" />

        {(title || subtitle) && (
          <div className="relative z-10 px-6 sm:px-10 pt-8 pb-2 text-center">
            {title && <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-2">{title}</p>}
            {subtitle && <p className="text-white/60 text-sm max-w-md mx-auto">{subtitle}</p>}
          </div>
        )}

        <div className="relative z-10 px-6 sm:px-10 pt-10 pb-6 flex flex-wrap items-start justify-center gap-x-10 gap-y-10">
          {CREW.map((member) => (
            <CrewMember
              key={member.id}
              member={member}
              isActive={activeId === member.id}
              onSelect={(id) => setActiveId((cur) => (cur === id ? null : id))}
            />
          ))}
        </div>
        <p className="relative z-10 text-center font-mono text-[10px] tracking-[0.2em] text-white/50 pb-6">
          $INTERN <span className="text-white/30">×</span> SPACE{" "}
          <span className="text-white/30">×</span> COMPUTE
        </p>
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden"
          >
            <div className="px-6 sm:px-10 py-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{active.name}</h3>
                  <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
                    {active.status}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-md">{active.blurb}</p>
                {active.stat && (
                  <p className="font-mono text-sm text-[var(--color-ember)] mt-3">
                    <AnimatedNumber value={Math.round(active.stat.value)} /> {active.stat.label}
                  </p>
                )}
              </div>
              <Link
                href={active.href}
                className="shrink-0 inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-xs font-medium px-5 py-2.5 hover:border-[var(--color-accent)]/50 transition-colors whitespace-nowrap"
              >
                MEET {active.name.toUpperCase()} →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!active && ctaHref && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] px-6 sm:px-10 py-5 text-center">
          <p className="font-mono text-[11px] text-[var(--color-muted-2)]">
            Tap a face above to see what they&apos;re up to, or{" "}
            <Link href={ctaHref} className="text-[var(--color-accent)] hover:underline">
              {ctaLabel ?? "see the full roster →"}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
