"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Mascot from "../components/Mascot";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";

function PreviewBadge() {
  return (
    <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2.5 py-1 tracking-widest">
      ART PREVIEW · MINT NOT LIVE
    </span>
  );
}

function useVolumeProgress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/genesis-progress")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setError(true);
        else setData(json);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}

function formatUsd(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// Illustrative trait recolors of Blaze -- real trait art doesn't exist
// yet (see docs/genesis-nft-spec.md). Same base mascot, different accent
// palette, just to show the shape of "500 unique but recognizably
// related" rather than pretending these are final.
const TRAIT_PREVIEWS = [
  { name: "#001 · Ember", filter: "none" },
  { name: "#002 · Frostbyte", filter: "hue-rotate(150deg)" },
  { name: "#003 · Nightshift", filter: "hue-rotate(230deg) saturate(1.3)" },
  { name: "#004 · Goldrush", filter: "hue-rotate(-60deg) saturate(1.4)" },
];

export default function GenesisView() {
  const { data: progress, error: progressError } = useVolumeProgress();

  return (
    <>
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-3 mb-4">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
            MEET THE GENESIS INTERNS
          </p>
          <PreviewBadge />
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          500 collectibles. One good reason to burn more $INTERN.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-4"
        >
          $INTERN is live and trading now — but minting doesn't open on day
          one. It opens the moment cumulative volume crosses{" "}
          <span className="text-[var(--color-fg)]">$1,000,000</span>. Earned, not
          day-one hype. Live progress toward that is below.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[var(--color-muted-2)] text-sm max-w-2xl">
          The trait art on this page is illustrative and the collection
          doesn't exist on-chain yet. See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/genesis-nft-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what's actually decided vs. still open.
        </Reveal>
      </section>

      <section className="px-6 pb-4 max-w-5xl mx-auto w-full">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-6 bg-[var(--color-surface)]">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <span className="text-[var(--color-muted)] tracking-wide">VOLUME TOWARD MINT UNLOCK</span>
            <span className="text-[var(--color-accent)]">
              {progress
                ? `${progress.progressPct.toFixed(3)}%`
                : progressError
                  ? "—"
                  : "LOADING…"}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--color-line)] overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: progress ? `${Math.max(progress.progressPct, 0.4)}%` : "0%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-[var(--color-accent)] rounded-full"
            />
          </div>
          <p className="font-mono text-xs text-[var(--color-muted)]">
            {progress
              ? `$${formatUsd(progress.volumeUsd)} / $${formatUsd(progress.targetUsd)}`
              : progressError
                ? "Live volume tracking is broken since the Pons migration (PAIR's API no longer covers this token) — refreshing won't fix it, see api/genesis-progress for the real fix needed."
                : "Fetching live volume…"}
          </p>
          {progress?.isRolling24h && (
            <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-2 leading-relaxed">
              Rolling 24h volume, not lifetime cumulative — equivalent for now since $INTERN
              is under a day old, but this will need to become a true running total once
              older volume starts aging out of that window.
            </p>
          )}
        </Reveal>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-5"
        >
          {TRAIT_PREVIEWS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="border border-[var(--color-line)] rounded-2xl p-5 bg-[var(--color-surface)]"
            >
              <div style={{ filter: t.filter }} className="aspect-square mb-3">
                <Mascot className="w-full h-full" />
              </div>
              <p className="font-mono text-[11px] text-[var(--color-muted)] text-center">{t.name}</p>
            </motion.div>
          ))}
        </motion.div>
        <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-5 text-center max-w-md mx-auto leading-relaxed">
          Illustrative recolors, not final trait art — the real 500 don't
          exist yet.
        </p>
      </section>

      <section className="px-6 py-20 border-t border-[var(--color-line)] max-w-5xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          THE MECHANIC
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
          Mint. Stake. Burn.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          {[
            {
              n: "01",
              title: "Mint",
              body: "Burn a fixed $INTERN amount to mint one Genesis Intern, while supply lasts — 500 total, ever.",
            },
            {
              n: "02",
              title: "Stake",
              body: "Stake it to stream a share of a BE reward pool — split pro-rata across whatever's currently staked.",
            },
            {
              n: "03",
              title: "Burn",
              body: "Destroy it to claim what it's earned so far. Supply drops by one, and everyone still staked owns a bigger share of what's left.",
            },
          ].map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="border border-[var(--color-line)] p-6">
              <p className="font-mono text-xs text-[var(--color-muted-2)] mb-4">{step.n}</p>
              <h3 className="text-lg font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
        <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-8 max-w-2xl leading-relaxed">
          This isn&apos;t built yet, and won&apos;t be marketed as
          guaranteed income when it is — a real legal review of that
          framing happens before anything here touches real money.
        </p>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-3">
            MINTING IS GATED, NOT SCHEDULED
          </p>
          <p className="text-[var(--color-fg)] text-lg mb-6 max-w-xl mx-auto">
            No date, no countdown timer — just the volume bar above. It
            unlocks the instant that number hits $1,000,000, whenever that
            is. Trade $INTERN to help get it there.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/trade"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              TRADE $INTERN →
            </Link>
            <Link
              href="/tokenomics"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              SEE THE TOKENOMICS →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
