"use client";

import { useEffect, useState } from "react";

// Real streak of consecutive days this WALLET has opened this page ON
// THIS BROWSER -- deliberately labeled that way, not "your streak,"
// because that's the honest scope of what localStorage can actually
// track. There's no account/database in this codebase (see
// lib/videoCredits.js's own disclosed in-memory-only limitation) to
// tie a streak to a wallet across devices, so this doesn't pretend to.
// Clearing site data or switching browsers resets it -- same tradeoff
// every localStorage-based feature on this site already accepts.
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);
}

export function useVisitStreak(address) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!address) {
      setCount(null);
      return;
    }
    const key = `intern-streak-${address.toLowerCase()}`;
    try {
      const raw = localStorage.getItem(key);
      const today = todayUtc();
      const prev = raw ? JSON.parse(raw) : null;

      let next;
      if (!prev) {
        next = { count: 1, last: today };
      } else {
        const gap = daysBetween(prev.last, today);
        if (gap === 0) next = prev; // already counted today
        else if (gap === 1) next = { count: prev.count + 1, last: today };
        else next = { count: 1, last: today }; // streak broken
      }
      localStorage.setItem(key, JSON.stringify(next));
      setCount(next.count);
    } catch {
      setCount(null); // storage blocked -- fail quiet, no streak shown
    }
  }, [address]);

  return count;
}

export default function StreakBadge({ address }) {
  const count = useVisitStreak(address);
  if (!address || !count) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--color-ember)]/30 bg-[var(--color-ember)]/10 px-3 py-1.5">
      <span className="text-base">🔥</span>
      <span className="font-mono text-xs text-[var(--color-ember)]">
        {count} day{count === 1 ? "" : "s"} in a row
      </span>
      <span className="font-mono text-[9px] text-[var(--color-muted-2)]">(this device)</span>
    </div>
  );
}
