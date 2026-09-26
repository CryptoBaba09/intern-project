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
//
// Swapped in 2026-09-26 for trading competition #2 (ends 2026-10-03 12:00 UTC;
// #1 ran 2026-09-18 to 2026-09-25, before the migration deadline) -- the migration reminder isn't gone,
// it still surfaces automatically on /stake for any wallet actually
// holding v1 (see MigrationBox), same pattern Nav.js's own comment
// describes for why it dropped out of primary nav. Swap this object
// back once the competition ends, or replace it with whatever's next.
const CAMPAIGN = {
  id: "trading-competition-2-sep-2026",
  href: "/trade",
  cta: "Go trade →",
  start: "2026-09-26",
  end: "2026-10-03T12:00:00Z",
  label: "$INTERN Trading Competition #2",
  copy: "Top 5 win tokenized stocks (TSLA, NVDA, SPCX or BE). Prize pool = 1% of all volume, $20 already in. Buy $10+, stake it or trade $200, tag @InternburnHQ on X.",
};

function daysLeft() {
  const end = new Date(CAMPAIGN.end.length > 10 ? CAMPAIGN.end : `${CAMPAIGN.end}T23:59:59Z`);
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
      {/* Fixed dark regardless of theme, same reasoning as Nav.js -- this
          bar sits directly above it, which sits directly above a
          SpaceField-backed hero on every page that has one. A
          theme-following bg here would reopen the exact seam Nav.js's
          own comment documents, one row higher. */}
      <div
        className="relative px-6 py-2.5 border-b border-[#D9A441]/25 hover:bg-white/[0.04] transition-colors"
        style={{ backgroundColor: "rgba(15,10,4,0.94)" }}
      >
        <div className="max-w-6xl mx-auto w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center pr-6">
          <span className="font-mono text-[10px] text-[#D9A441] tracking-widest border border-[#D9A441]/40 rounded-full px-2 py-0.5 shrink-0">
            {CAMPAIGN.noCountdown ? "UPDATE" : left === 1 ? "LAST DAY" : `${left} DAYS LEFT`}
          </span>
          <span className="text-sm text-[var(--color-space-fg)]">
            <strong className="font-semibold">{CAMPAIGN.label}</strong> — {CAMPAIGN.copy}
          </span>
          <span className="font-mono text-xs text-[#D9A441] group-hover:underline shrink-0">
            {CAMPAIGN.cta ?? "See the rules →"}
          </span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-space-muted)] hover:text-[var(--color-space-fg)] p-1.5 rounded-md hover:bg-white/[0.08] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
