"use client";

import { motion } from "framer-motion";

// Every badge here is a CURRENT on-chain state check, not a historical
// "first time you did X" claim -- this site has no database recording
// wallet history yet (see lib/videoCredits.js's own disclosed
// in-memory-only limitation), so a "first burn" badge would be a lie
// the moment the server cold-starts. State-based badges stay honest
// under that constraint: they're never wrong, just re-derived live
// every time from balanceOf()/totalStaked()/earned(), the same reads
// already used elsewhere on the site.
const BADGES = [
  {
    id: "holder",
    emoji: "🪙",
    label: "Holder",
    desc: "Hold any $INTERN",
    unlocked: ({ balance }) => balance !== null && balance > 0,
  },
  {
    id: "staker",
    emoji: "🔒",
    label: "Staker",
    desc: "Stake any $INTERN",
    unlocked: ({ staked }) => staked !== null && staked > 0,
  },
  {
    id: "earning",
    emoji: "⚡",
    label: "Earning BE",
    desc: "Have unclaimed BE rewards",
    unlocked: ({ earned }) => earned !== null && earned > 0,
  },
  {
    id: "fulltime",
    emoji: "🏆",
    label: "Full-Time Offer",
    desc: "Stake 1,000,000+ $INTERN",
    unlocked: ({ staked }) => staked !== null && staked >= 1_000_000,
  },
];

export default function Badges({ balance, staked, earned }) {
  const ctx = { balance, staked, earned };
  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-5">
        BADGES · LIVE, NOT HISTORICAL
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BADGES.map((b) => {
          const on = b.unlocked(ctx);
          return (
            <motion.div
              key={b.id}
              initial={false}
              animate={on ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.35 }}
              className={`rounded-xl border p-3 text-center transition-colors ${
                on
                  ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                  : "border-[var(--color-line)] opacity-40"
              }`}
            >
              <p className={`text-2xl mb-1 ${on ? "" : "grayscale"}`}>{b.emoji}</p>
              <p className="font-mono text-[10px] text-[var(--color-fg)] leading-tight">{b.label}</p>
              <p className="font-mono text-[8px] text-[var(--color-muted-2)] leading-tight mt-1">
                {b.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
