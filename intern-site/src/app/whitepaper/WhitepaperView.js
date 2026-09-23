"use client";

import Link from "next/link";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";

function SectionLabel({ children }) {
  return (
    <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
      {children}
    </Reveal>
  );
}

function StatusTag({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5 shrink-0">
      {children}
    </span>
  );
}

const LIVE_TODAY = [
  {
    title: "Autonomous burn engine",
    body: "Blaze claims creator fees off the $INTERN/ETH pool on a daily schedule and splits them 70/20/10 — no deploy step, no user action. Confirmed running for real 2026-09-16, after a Vercel Cron frequency-limit bug silently blocked every deploy since it was written.",
    status: "LIVE",
  },
  {
    title: "Staking asset",
    body: "Stake $INTERN, earn a time-weighted, pro-rata share of BE from every creator fee claim. Non-custodial — the contract only ever holds your $INTERN while staked, and only pays out BE it has actually received.",
    status: "LIVE",
  },
  {
    title: "Choose your reward",
    body: "Convert claimed BE into real, tokenized TSLA, NVDA, or SPCX — one approval, one swap, straight to your wallet, via a real Uniswap V3 route with real slippage protection.",
    status: "LIVE",
  },
  {
    title: "Roster Call",
    body: "The community pitches new intern personas through a real form, backed by a real database. Treasury reviews submissions and pays chosen ideas in $INTERN by hand.",
    status: "LIVE",
  },
  {
    title: "Digital personas",
    body: "Rendo (text, gated by stake tier) and video generation across all four personas (burn-based) are both live today.",
    status: "LIVE",
  },
  {
    title: "Inference credits",
    body: "Burn $INTERN at the live price for an instant, spend-capped OpenRouter key — usable on Claude, GPT, Gemini, and hundreds of other models.",
    status: "TOP-UP LIVE",
  },
];

const ROADMAP_PHASES = [
  {
    phase: "Now",
    items: [
      "Burn engine running on its real daily schedule",
      "Staking distributing real BE as fees accrue",
      "Choose your reward: BE → TSLA / NVDA / SPCX",
      "Roster Call accepting real community submissions",
    ],
  },
  {
    phase: "Next",
    items: [
      "Choose your reward, Phase 2 — open the target-asset list to any token with real onchain liquidity, not just an owner-curated three",
      "A standing reward preference, so future claims land pre-converted instead of a manual step every time",
      "Independent professional security review of InternStakingRewards and InternRewardsRouter",
      "Shared, multi-approval control over both contracts' admin functions, instead of one wallet holding that access alone",
      "Cache, the Yield & Borrow Intern — deposit USDG for real yield, or post a tokenized stock as collateral to borrow against it",
    ],
  },
  {
    phase: "Exploring",
    items: [
      "Tiered loyalty bonus on top of the core staking distribution (code exists, deliberately not deployed — see Security below)",
      "Resource-sharing rewards for holders contributing resources they aren't using",
      "Custom intern builds: launch your own $INTERN-powered agent for a burn fee plus a staking minimum",
      "Staked premium intern templates",
    ],
  },
];

export default function WhitepaperView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-3xl mx-auto w-full">
        <SectionLabel>WHITEPAPER · 2026-09-23</SectionLabel>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          One $INTERN. Multiple hats.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed">
          This document describes what $INTERN actually does today, what's real vs. still in
          design, and where it's headed — written to be checked, not taken on faith. Every claim
          below either links to a live page you can use right now, or is explicitly marked as not
          live yet. Nothing here is investment, financial, or legal advice.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <SectionLabel>THESIS</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-4">
          An intern is never just one thing
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] leading-relaxed mb-4">
          The future of work runs on agents, not headcount. $INTERN is built the same way a real
          intern is useful — across whatever job needs doing, not locked to one — and every job
          it does spends $INTERN, which either burns supply directly or streams real value (BE,
          and now real stock tokens) back to the people staking it.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[var(--color-muted)] leading-relaxed">
          Fixed supply, 1,000,000,000 $INTERN, no mint function, ever. The token only ever gets
          scarcer as the utility gets used — that's the entire deflationary mechanism, and it
          doesn't depend on anyone believing a narrative, since the burned balance is a real
          number anyone can read off the dead address.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <SectionLabel>LIVE TODAY</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          What's actually running, right now
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          Every item here is deployed and usable today — not a mockup, not a roadmap bullet
          wearing a "live" badge it hasn't earned.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="space-y-px bg-[var(--color-line)] border border-[var(--color-line)]"
        >
          {LIVE_TODAY.map((item) => (
            <motion.div key={item.title} variants={fadeUp} className="bg-[var(--color-bg)] p-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-base font-medium">{item.title}</h3>
                <StatusTag>{item.status}</StatusTag>
              </div>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{item.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <SectionLabel>MECHANICS</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          Where the money actually goes
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] leading-relaxed mb-6">
          Every real trade on Pons pays a 2% fee (1% base pool fee + 1% creator tax). Once
          claimed, that ETH splits three ways:
        </Reveal>
        <Reveal>
          <div className="border border-[var(--color-line)] divide-y divide-[var(--color-line)]">
            <div className="p-5 flex items-center justify-between">
              <span className="text-sm">Buy-and-burn</span>
              <span className="font-mono text-sm text-[var(--color-ember)]">70%</span>
            </div>
            <div className="p-5 flex items-center justify-between">
              <span className="text-sm">Streamed to staked $INTERN, as BE</span>
              <span className="font-mono text-sm text-[var(--color-accent)]">20%</span>
            </div>
            <div className="p-5 flex items-center justify-between">
              <span className="text-sm">Treasury</span>
              <span className="font-mono text-sm text-[var(--color-muted)]">10%</span>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="mt-4">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            If nobody is staked in a given cycle, the 20% distribution share folds into burn
            instead of sitting idle — checked fresh every cycle, so it reverts to the normal
            three-way split automatically the moment anyone stakes. See{" "}
            <Link href="/tokenomics" className="text-[var(--color-accent)] hover:underline">
              tokenomics
            </Link>{" "}
            for the full breakdown and{" "}
            <Link href="/docs" className="text-[var(--color-accent)] hover:underline">
              docs
            </Link>{" "}
            for the exact contract addresses.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <SectionLabel>ROADMAP</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          Now, next, exploring
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          Three honest buckets instead of one long list that doesn't distinguish "shipping this
          week" from "an idea worth having." Nothing in Next or Exploring has a date attached —
          dates get added only once something is actually being built.
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6">
          {ROADMAP_PHASES.map((p) => (
            <Reveal key={p.phase} className="border border-[var(--color-line)] p-6">
              <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4">
                {p.phase.toUpperCase()}
              </p>
              <ul className="space-y-3">
                {p.items.map((item) => (
                  <li key={item} className="text-sm text-[var(--color-muted)] leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1} className="mt-6">
          <p className="font-mono text-xs text-[var(--color-muted-2)]">
            Full status grid, including everything still IN DESIGN or PLANNED, on the{" "}
            <Link href="/roadmap" className="text-[var(--color-accent)] hover:underline">
              roadmap page
            </Link>
            .
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <SectionLabel>SECURITY</SectionLabel>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          Built carefully, still growing up
        </Reveal>
        <Reveal className="space-y-5">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Every contract is unit-tested and reviewed in-house, including an automated security
            pass with zero findings on the router. An independent audit is next — real value
            already moves through these contracts, so verify the source yourself on{" "}
            <a
              href="https://robinhoodchain.blockscout.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Blockscout
            </a>{" "}
            and stake what you&apos;re comfortable with, same as any young protocol.
          </p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Admin controls sit with one wallet for now, moving to shared control soon. Perky, our
            loyalty bonus, is finished but intentionally not live yet — we caught a timing edge
            case in our own tests and we&apos;re not shipping it until that&apos;s closed.
          </p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Same story with Cache&apos;s borrow side — we caught something in our own testing
            before launch and we&apos;re not shipping it until it&apos;s fully closed out.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-24 max-w-3xl mx-auto w-full">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-8 text-center">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4">
            VERIFY IT YOURSELF
          </p>
          <p className="text-[var(--color-muted)] text-sm leading-relaxed mb-6 max-w-xl mx-auto">
            Every address, every contract, every live number on this page is checkable right now
            — that&apos;s the actual pitch, not a slogan.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              SEE VERIFIED ADDRESSES →
            </Link>
            <Link
              href="/roadmap"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              FULL ROADMAP →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
