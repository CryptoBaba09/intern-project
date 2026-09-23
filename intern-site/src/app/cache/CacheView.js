"use client";

// Cache, the Yield Intern -- full page. Same shape as InterndexView.js
// (persona intro, live stats, the actual flow, honesty disclosures),
// but the flow itself is CacheDepositPreview's PREVIEW/LIVE split
// (RewardChoicePreview's pattern) since CacheVaultDeposit isn't
// deployed yet -- see lib/chain.js's isCacheVaultLive() and
// docs/cache-intern-spec.md.
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "../components/motion";
import CacheDepositPreview from "../components/CacheDepositPreview";
import { CONTRACTS, isCacheVaultLive } from "../lib/chain";
import { useCacheVault, formatUsdg, MORPHO_VAULT_URL } from "./useCacheVault";

function StatusBadge({ children, tone = "ember" }) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--color-accent)] border-[var(--color-accent)]/30"
      : "text-[var(--color-ember)] border-[var(--color-ember)]/30";
  return (
    <span className={`font-mono text-[10px] border rounded-full px-2.5 py-1 tracking-widest ${colorClass}`}>
      {children}
    </span>
  );
}

export default function CacheView() {
  const live = isCacheVaultLive();
  const { totalAssets } = useCacheVault();

  return (
    <section className="px-6 pt-16 pb-24 max-w-5xl mx-auto w-full">
      <Reveal className="flex items-center gap-4 mb-6 flex-wrap">
        <Image
          src="/personas/cache-icon.png"
          alt="Cache icon"
          width={64}
          height={64}
          className="rounded-full border border-[var(--color-line)] w-14 h-14"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">MEET CACHE · YIELD INTERN</p>
          <StatusBadge tone={live ? "accent" : "ember"}>{live ? "LIVE" : "IN DESIGN"}</StatusBadge>
        </div>
      </Reveal>

      <Reveal delay={0.05} as="h1" className="text-4xl sm:text-5xl font-semibold leading-[1.05] mb-6 max-w-2xl">
        Deposit USDG. Earn real yield. Skim a little, burn it.
      </Reveal>

      <Reveal delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-10">
        Cache routes your USDG straight into the same Morpho vault{" "}
        <a href={MORPHO_VAULT_URL} target="_blank" rel="noopener noreferrer" className="underline text-[var(--color-fg)]">
          Robinhood Earn itself deposits into
        </a>{" "}
        — Steakhouse USDG, curated by Steakhouse Financial. Non-custodial: the vault shares that come back are
        yours, in your wallet, the whole time. Cache never holds them between transactions.
      </Reveal>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <div className="border border-[var(--color-line)] rounded-2xl p-6">
          <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-widest mb-2">
            VAULT TVL · LIVE ON-CHAIN READ
          </p>
          <p className="text-3xl font-semibold font-mono">
            {totalAssets !== undefined ? `$${formatUsdg(totalAssets, 0)}` : "…"}
          </p>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
            Read directly off the real vault contract, not cached — refreshes automatically.
          </p>
        </div>
        <div className="border border-[var(--color-line)] rounded-2xl p-6">
          <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-widest mb-2">SUPPLY APY</p>
          <p className="text-3xl font-semibold font-mono text-[var(--color-muted)]">See on Morpho ↗</p>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
            <a href={MORPHO_VAULT_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Morpho&apos;s own live number
            </a>{" "}
            — deliberately not duplicated here, so it can never quietly go stale on our side.
          </p>
        </div>
      </div>

      <Reveal delay={0.15}>
        <CacheDepositPreview />
      </Reveal>

      <Reveal delay={0.2} className="mt-10 border-t border-[var(--color-line)] pt-8">
        <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">WHAT&apos;S REAL RIGHT NOW</p>
        <ul className="text-sm text-[var(--color-muted)] leading-relaxed space-y-2 list-disc list-inside">
          <li>The vault is real, live, and independently verified — $493M+ TVL confirmed directly on Morpho.</li>
          <li>
            <code className="text-[var(--color-fg)]">CacheVaultDeposit.sol</code> is written, unit-tested (19/19
            passing), and has cleared an in-house Slither + manual security review — same bar this project already
            holds itself to for its other fund-moving contracts.
          </li>
          <li>
            {live ? (
              <>Deployed at <code className="text-[var(--color-fg)]">{CONTRACTS.cacheVaultDeposit}</code>.</>
            ) : (
              "Not deployed anywhere yet — deploying is a separate, deliberate decision from writing and reviewing it, and hasn't been made yet."
            )}
          </li>
          <li>No independent professional audit yet — in-house review is a floor, not a substitute for outside eyes.</li>
        </ul>
        <p className="mt-6">
          <Link href="/marketplace" className="font-mono text-xs text-[var(--color-fg)] hover:underline">
            ← Back to all interns
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
