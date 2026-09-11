"use client";

import { motion } from "framer-motion";
import { formatNumber } from "../lib/format";

// Same three tiers PersonasView.js/StakeView.js already gate Rendo's
// real generations and Genesis perks on (10k/100k/1M $INTERN staked) --
// reused here, not reinvented, so this path can never say something
// different from what the rest of the site actually enforces.
const TIERS = [
  { name: "Intern", min: 0, threshold: 10_000 },
  { name: "Senior Intern", min: 10_000, threshold: 100_000 },
  { name: "Full-Time Offer", min: 100_000, threshold: 1_000_000 },
];

function segmentFill(staked, tier) {
  if (staked === null) return 0;
  if (staked <= tier.min) return 0;
  if (staked >= tier.threshold) return 1;
  return (staked - tier.min) / (tier.threshold - tier.min);
}

// A Duolingo-style "path" rather than a plain progress bar -- three
// real segments, each filling only from real staked balance (or null
// while still loading, rendered as an honest 0% rather than a guess).
export default function TierPath({ staked }) {
  const currentTierIndex = TIERS.findIndex((t) => staked === null || staked < t.threshold);
  const activeIndex = currentTierIndex === -1 ? TIERS.length - 1 : currentTierIndex;
  const nextTier = TIERS[activeIndex];
  const remaining = staked !== null ? Math.max(nextTier.threshold - staked, 0) : null;
  const maxedOut = staked !== null && staked >= TIERS[TIERS.length - 1].threshold;

  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-5">
        STAKING PATH
      </p>

      <div className="flex items-center gap-1">
        {TIERS.map((tier, i) => {
          const fill = segmentFill(staked, tier);
          const reached = fill >= 1;
          return (
            <div key={tier.name} className="flex-1 flex items-center gap-1">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <motion.div
                  animate={reached ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-mono text-[10px] shrink-0 ${
                    reached
                      ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "border-[var(--color-line)] text-[var(--color-muted)]"
                  }`}
                >
                  {reached ? "✓" : i + 1}
                </motion.div>
                <p className="font-mono text-[9px] text-[var(--color-muted)] whitespace-nowrap text-center max-w-[64px] leading-tight">
                  {tier.name}
                </p>
              </div>
              {i < TIERS.length - 1 && (
                <div className="flex-1 h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden -mt-5">
                  <motion.div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${segmentFill(staked, TIERS[i]) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="font-mono text-xs text-[var(--color-fg)] mt-6 text-center">
        {staked === null
          ? "Connect a wallet to see your real path."
          : maxedOut
            ? "🏆 Full-Time Offer reached — top tier, for real."
            : `${formatNumber(Math.ceil(remaining))} $INTERN to ${nextTier.name}`}
      </p>
    </div>
  );
}
