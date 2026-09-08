"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Site-wide, above the nav, on purpose -- a live time-limited campaign
// buried mid-page on the homepage only (its old spot) meant most visitors,
// and every non-home page, never saw it. This is the one thing that gets
// top billing over the site's usual restraint.
//
// Hardcode the campaign here when it changes or ends -- there's exactly
// one live campaign at a time, so a config array is more machinery than
// this needs right now.
const CAMPAIGN = {
  id: "burn-to-create-sep-2026",
  href: "/burn-to-create",
  start: "2026-09-07",
  end: "2026-09-21",
  label: "Burn to Create",
  copy: "burn $INTERN, make real content with the credit, win a 5x match + Genesis whitelist.",
};

function daysLeft() {
  const end = new Date(`${CAMPAIGN.end}T23:59:59Z`);
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true); // hidden until confirmed not-dismissed, to match sessionStorage before paint would need a blocking script; a one-frame absence is a fine tradeoff for a banner, unlike the theme flash
  const [left, setLeft] = useState(null);

  useEffect(() => {
    setLeft(daysLeft());
    try {
      setDismissed(sessionStorage.getItem(`dismissed-${CAMPAIGN.id}`) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || left === null || left <= 0) return null;

  function dismiss(e) {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem(`dismissed-${CAMPAIGN.id}`, "1");
    } catch {
      // storage blocked -- it just re-shows next reload, harmless
    }
  }

  return (
    <Link href={CAMPAIGN.href} className="block group">
      <div className="relative px-6 py-2.5 bg-[var(--color-ember)]/[0.08] border-b border-[var(--color-ember)]/25 hover:bg-[var(--color-ember)]/[0.13] transition-colors">
        <div className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center pr-6">
          <span className="font-mono text-[10px] text-[var(--color-ember)] tracking-widest border border-[var(--color-ember)]/40 rounded-full px-2 py-0.5 shrink-0">
            {left === 1 ? "LAST DAY" : `${left} DAYS LEFT`}
          </span>
          <span className="text-sm text-[var(--color-fg)]">
            <strong className="font-semibold">{CAMPAIGN.label}</strong> — {CAMPAIGN.copy}
          </span>
          <span className="font-mono text-xs text-[var(--color-ember)] group-hover:underline shrink-0">
            See the rules →
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-fg)] p-1.5 rounded-md hover:bg-[var(--color-fg)]/[0.06] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
