"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import AnimatedNumber from "../components/AnimatedNumber";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { formatNumber } from "../lib/format";
import { CONTRACTS, DEAD_ADDRESS, isStakingLive, isTradingLive } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../lib/abis";

const LAUNCH_SUPPLY = 1_000_000_000;

// Mirrors intern-burn-bot/lib/config.js's own defaults (BURN_PERCENT=70,
// DISTRIBUTION_PERCENT=20, TREASURY_PERCENT=10) so this simulator computes
// the split the same way the real bot does -- not a separate guess. An
// operator can override those via env vars on the bot's own deploy, which
// this page has no way to read, so treat this as "the default policy",
// not a value this page can guarantee is still live right now.
const BURN_PERCENT = 70;
const DISTRIBUTION_PERCENT = 20;
const TREASURY_PERCENT = 10;

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

// Same real read as TokenomicsView's LiveBurnTicker and HomeView's crew
// scene -- the dead address's own balance IS the cumulative burn total,
// since the bot sends via transfer(), not burn().
function useBlazeStats() {
  const { data: burnedRaw, isLoading } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [DEAD_ADDRESS],
    query: { enabled: isTradingLive(), refetchInterval: 10000 },
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
    query: { enabled: isStakingLive(), refetchInterval: 10000 },
  });

  const burned = burnedRaw !== undefined ? Number(formatUnits(burnedRaw, decimals ?? 18)) : null;
  const totalStaked =
    totalStakedRaw !== undefined ? Number(formatUnits(totalStakedRaw, decimals ?? 18)) : null;

  return { burned, totalStaked, isLoading };
}

function LiveBurnTicker() {
  const { burned, isLoading } = useBlazeStats();
  const supply = burned !== null ? LAUNCH_SUPPLY - burned : LAUNCH_SUPPLY;
  const pctBurned = burned !== null ? ((burned / LAUNCH_SUPPLY) * 100).toFixed(4) : "0.0000";

  return (
    <section className="px-6 py-16 border-y border-[var(--color-line)] bg-[var(--color-surface)]">
      <Reveal className="max-w-3xl mx-auto text-center">
        <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ember-pulse" />
          LIVE SUPPLY · READ DIRECTLY FROM THE DEAD ADDRESS
        </p>
        <p className="font-mono text-6xl sm:text-7xl font-bold text-[var(--color-ember)] ember-glow tabular-nums">
          {burned === null ? (isLoading ? "…" : formatNumber(supply)) : <AnimatedNumber value={Math.round(supply)} />}
        </p>
        <p className="font-mono text-sm text-[var(--color-muted)] mt-4">
          {burned === null ? "—" : formatNumber(Math.round(burned))} $INTERN burned so far ({pctBurned}%)
        </p>
        <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-6 max-w-md mx-auto leading-relaxed">
          Not self-reported — this is {DEAD_ADDRESS}&apos;s real balance,
          refreshed every 10 seconds.{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/address/${DEAD_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            Verify on Blockscout ↗
          </a>
        </p>
      </Reveal>
    </section>
  );
}

// The one real interactive "thing Blaze does": simulate a fee claim and
// watch it split the same way the production bot's computeSplit() does --
// including the real conditional-burn-fallback rule (the 20% distribution
// cut folds into burn instead of sitting idle whenever nobody's staked),
// decided here from a live totalStaked() read, not a hardcoded assumption.
function BurnSplitSimulator() {
  const { totalStaked } = useBlazeStats();
  const [feeEth, setFeeEth] = useState("1");

  const fee = parseFloat(feeEth) || 0;
  const distributeToStakers = isStakingLive() && totalStaked !== null && totalStaked > 0;
  const effectiveBurnPercent = distributeToStakers ? BURN_PERCENT : BURN_PERCENT + DISTRIBUTION_PERCENT;
  const effectiveDistributionPercent = distributeToStakers ? DISTRIBUTION_PERCENT : 0;

  const burnAmount = (fee * effectiveBurnPercent) / 100;
  const distributionAmount = (fee * effectiveDistributionPercent) / 100;
  const treasuryAmount = fee - burnAmount - distributionAmount;

  const rows = [
    {
      label: "Buy & burn",
      pct: effectiveBurnPercent,
      amount: burnAmount,
      color: "var(--color-ember)",
    },
    {
      label: "To stakers (BE)",
      pct: effectiveDistributionPercent,
      amount: distributionAmount,
      color: "var(--color-accent)",
    },
    {
      label: "Treasury",
      pct: TREASURY_PERCENT,
      amount: treasuryAmount,
      color: "var(--color-muted)",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-3xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        TRY IT
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-4">
        Simulate a fee claim.
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-xl"
      >
        Type in a hypothetical ETH fee claim and watch it split exactly the
        way{" "}
        <a
          href="https://github.com/CryptoBaba09/intern-project/blob/main/intern-burn-bot/lib/distribute.js"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent)] hover:underline"
        >
          the real bot&apos;s split logic ↗
        </a>{" "}
        does — right now,{" "}
        {isStakingLive() && totalStaked !== null ? (
          distributeToStakers ? (
            <>the staking pool has real $INTERN in it, so the 20% distribution cut streams to stakers as BE.</>
          ) : (
            <>nobody has staked $INTERN yet, so the 20% distribution cut folds into the burn instead of sitting idle.</>
          )
        ) : (
          <>staking status is loading.</>
        )}
      </Reveal>

      <div className="border border-[var(--color-line)] rounded-2xl p-6 bg-[var(--color-surface)]">
        <label className="block font-mono text-xs text-[var(--color-muted)] tracking-wide mb-2">
          HYPOTHETICAL FEE CLAIM (ETH)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={feeEth}
          onChange={(e) => setFeeEth(e.target.value)}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 text-lg font-mono outline-none focus:border-[var(--color-accent)]/50 mb-6"
        />

        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="space-y-4"
        >
          {rows.map((row) => (
            <motion.div key={row.label} variants={fadeUp}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm text-[var(--color-fg)]">{row.label}</p>
                <p className="font-mono text-sm text-[var(--color-muted)]">
                  {row.pct}% · {row.amount.toFixed(4)} ETH
                </p>
              </div>
              <div className="h-2 rounded-full bg-[var(--color-line)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: row.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-6 leading-relaxed">
          70/20/10 is the bot&apos;s default split — an operator can change
          it via env var, which this page can&apos;t see. The
          conditional-burn-fallback rule above (fold 20% into burn when
          nobody&apos;s staked) uses a live{" "}
          <code className="text-[var(--color-fg)]">totalStaked()</code>{" "}
          read, so that part reflects the real chain state right now.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Fees roll in",
      body: "Every trade on Pons's $INTERN/ETH curve pays a 2% fee. It accrues in the fee escrow, claimable by the creator.",
    },
    {
      n: "02",
      title: "The bot claims & splits",
      body: "On a schedule, the bot sweeps and claims those fees, then splits the ETH 70/20/10 — burn, stakers, treasury.",
    },
    {
      n: "03",
      title: "Buy & burn",
      body: "The burn share buys $INTERN on the curve and sends it to the dead address, permanently, on-chain, verifiable by anyone.",
    },
  ];
  return (
    <section className="px-6 py-20 border-t border-[var(--color-line)] max-w-5xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        HOW IT WORKS
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
        No user action needed.
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

export default function BlazeView() {
  return (
    <>
      <section className="px-6 pt-16 pb-10 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-4 mb-6 flex-wrap">
          <Image
            src="/personas/blaze-icon.png"
            alt="Blaze icon"
            width={64}
            height={64}
            className="rounded-full border border-[var(--color-line)] w-14 h-14"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
              MEET BLAZE · BURN TRACKER INTERN
            </p>
            <LiveBadge>LIVE</LiveBadge>
          </div>
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          The protocol&apos;s own burn engine.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl"
        >
          No deploy, no fee, nothing to buy. Every time creator fees are
          claimed off the $INTERN/ETH pool, most of it is bought back and
          burned automatically — the live number below is real, read
          straight from the dead address.
        </Reveal>
      </section>

      <LiveBurnTicker />
      <BurnSplitSimulator />
      <HowItWorks />

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-3">
            AUTONOMOUS · NO USER ACTION NEEDED
          </p>
          <p className="text-[var(--color-fg)] text-lg mb-6 max-w-xl mx-auto">
            Blaze doesn&apos;t need you to do anything. Stake $INTERN to be
            on the receiving end of the 20% cut once it&apos;s not folding
            into burn.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/stake"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              GO TO STAKING →
            </Link>
            <Link
              href="/marketplace"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              MEET THE OTHER INTERNS →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
