"use client";

// Cache, the Yield & Borrow Intern -- full page. Same shape as
// InterndexView.js (persona intro, live stats, the actual flow).
// User-facing copy here is deliberately product-level only -- no
// backend/infra names, contract names, test counts, or audit-process
// detail (see memory: frontend-copy-no-backend-leakage). The real
// technical detail (contract addresses, what's still being fixed)
// lives in /docs and /whitepaper's Security section instead, which
// are explicitly the "verify it yourself" pages, not this one.
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "../components/motion";
import PersonaIntroVideo from "../components/PersonaIntroVideo";
import PersonaProductSplit from "../components/PersonaProductSplit";
import CacheDepositPreview from "../components/CacheDepositPreview";
import CacheBorrowPanel from "../components/CacheBorrowPanel";
import { isCacheVaultLive, isCacheBorrowLive } from "../lib/chain";
import { useCacheVault, useVaultApy, formatUsdg, MORPHO_VAULT_URL } from "./useCacheVault";

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
  const live = isCacheVaultLive() || isCacheBorrowLive();
  const { totalAssets } = useCacheVault();
  const vaultApy = useVaultApy();

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
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">MEET CACHE · YIELD &amp; BORROW INTERN</p>
          <StatusBadge tone={live ? "accent" : "ember"}>{live ? "LIVE" : "COMING SOON"}</StatusBadge>
        </div>
      </Reveal>

      <Reveal delay={0.05} as="h1" className="text-4xl sm:text-5xl font-semibold leading-[1.05] mb-6 max-w-2xl">
        Deposit USDG, or borrow against a real stock. Skim a little, burn it.
      </Reveal>

      <Reveal delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-10">
        Deposit USDG and earn real yield — or post a tokenized stock as collateral and borrow USDG against it,
        or supply USDG directly and earn from real borrowers. Non-custodial the whole way through: whatever
        comes back is always yours, in your own wallet. A small cut is skimmed once, auto-bought-back into
        $INTERN and burned.
      </Reveal>

      <Reveal delay={0.12} className="mb-10">
        <PersonaProductSplit
          media={
            <PersonaIntroVideo
              src="/personas/videos/cache-intro.mp4"
              poster="/personas/cache.png"
              label="Cache idle animation"
            />
          }
        >
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="border border-[var(--color-line)] rounded-2xl p-6">
              <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-widest mb-2">
                VAULT SIZE · LIVE
              </p>
              <p className="text-3xl font-semibold font-mono">
                {totalAssets !== undefined ? `$${formatUsdg(totalAssets, 0)}` : "…"}
              </p>
              <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
                Refreshes automatically — not a self-reported number.
              </p>
            </div>
            <div className="border border-[var(--color-line)] rounded-2xl p-6">
              <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-widest mb-2">SUPPLY APY · LIVE</p>
              <p className="text-3xl font-semibold font-mono">
                {vaultApy.loading
                  ? "…"
                  : vaultApy.apy != null
                    ? `${(vaultApy.apy * 100).toFixed(2)}%`
                    : "—"}
              </p>
              <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
                Refreshes automatically —{" "}
                <a href={MORPHO_VAULT_URL} target="_blank" rel="noopener noreferrer" className="underline">
                  verify it yourself
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-3">JUST EARN YIELD</p>
            <CacheDepositPreview />
          </div>

          <div>
            <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-3">
              BORROW AGAINST YOUR STOCK, OR SUPPLY AND EARN
            </p>
            <CacheBorrowPanel />
          </div>
        </PersonaProductSplit>
      </Reveal>

      <Reveal delay={0.2} className="mt-10 border-t border-[var(--color-line)] pt-8">
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">
          Full technical detail, including every contract address, lives on the{" "}
          <Link href="/docs" className="text-[var(--color-accent)] hover:underline">
            docs page
          </Link>
          .
        </p>
        <p className="mt-6">
          <Link href="/marketplace" className="font-mono text-xs text-[var(--color-fg)] hover:underline">
            ← Back to all interns
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
