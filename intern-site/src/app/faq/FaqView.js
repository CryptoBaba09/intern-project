"use client";

// FAQ -- grounded entirely in what's actually true on this site today
// (tokenomics, the six live interns, staking, Cache, security posture)
// rather than a generic crypto-project template. Same rules as every
// other consumer page: no backend/infra names, no contract-level
// jargon outside the Security category (which mirrors /docs and
// /whitepaper's own "verify it yourself" section, the one place this
// site is deliberately more technical), and no narrating past bugs or
// shortfalls -- current status, stated plainly.
import { useState } from "react";
import Link from "next/link";
import { Reveal } from "../components/motion";

function SectionLabel({ children }) {
  return (
    <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
      {children}
    </Reveal>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M1.5 3.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FaqItem({ q, a, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--color-line)] py-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="text-base font-medium">{q}</span>
        <span className="text-[var(--color-muted)] mt-0.5">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="text-sm text-[var(--color-muted)] leading-relaxed mt-3 max-w-2xl">{a}</div>
      )}
    </div>
  );
}

function FaqCategory({ title, items, defaultOpenFirst = false }) {
  return (
    <div className="mb-14">
      <h2 className="text-xl font-semibold mb-1">{title}</h2>
      <div>
        {items.map((item, i) => (
          <FaqItem key={item.q} q={item.q} a={item.a} defaultOpen={defaultOpenFirst && i === 0} />
        ))}
      </div>
    </div>
  );
}

const CATEGORIES = [
  {
    title: "General",
    items: [
      {
        q: "What is $INTERN?",
        a: (
          <>
            A fixed-supply utility token on Robinhood Chain built around one idea: an AI intern
            for every job, not one token you hold and hope on. Six interns are live today — each
            spends $INTERN for something real, and every spend either burns supply or streams
            value back to the people staking it.
          </>
        ),
      },
      {
        q: "Where do I buy $INTERN?",
        a: (
          <>
            $INTERN trades live against ETH on Pons.{" "}
            <Link href="/trade" className="text-[var(--color-accent)] hover:underline">
              Trade $INTERN →
            </Link>
          </>
        ),
      },
      {
        q: "What wallet and network do I need?",
        a: (
          <>
            Any standard EVM wallet (Rabby, MetaMask, Coinbase Wallet, and similar all work),
            connected to Robinhood Chain. The site prompts you to add or switch networks
            automatically the first time you connect.
          </>
        ),
      },
      {
        q: "Is this financial advice?",
        a: (
          <>
            No. Nothing on this site is investment, financial, or legal advice. $INTERN is a
            fixed-supply utility token with real smart-contract risk — only ever use what
            you&apos;re fully comfortable with.
          </>
        ),
      },
    ],
  },
  {
    title: "Tokenomics",
    items: [
      {
        q: "What's the total supply?",
        a: (
          <>
            1,000,000,000 $INTERN, fixed at launch. There is no mint function — supply only ever
            goes down, never up.{" "}
            <Link href="/tokenomics" className="text-[var(--color-accent)] hover:underline">
              Full breakdown →
            </Link>
          </>
        ),
      },
      {
        q: "How does the burning actually work?",
        a: (
          <>
            Every real trade on Pons pays a 2% fee. Once claimed, that fee splits 70/20/10:
            70% buys back $INTERN and burns it permanently, 20% streams to staked $INTERN as BE,
            and 10% goes to treasury. If nobody&apos;s staked in a given cycle, that 20% folds
            into the burn instead of sitting idle.
          </>
        ),
      },
      {
        q: "What is BE?",
        a: (
          <>
            BE is the real yield staking $INTERN earns — a time-weighted, pro-rata share of every
            creator-fee claim, streamed continuously, not a fixed promised rate.
          </>
        ),
      },
    ],
  },
  {
    title: "The interns",
    items: [
      {
        q: "What do the six interns actually do?",
        a: (
          <div className="space-y-2">
            <p>
              <span className="text-[var(--color-fg)]">Blaze</span> — the autonomous burn engine,
              no deploy or user action needed.
            </p>
            <p>
              <span className="text-[var(--color-fg)]">Rendo</span> — AI content: stake-gated text
              generation, burn-based video.
            </p>
            <p>
              <span className="text-[var(--color-fg)]">Promptly</span> — burn $INTERN for an
              instant, spend-capped AI inference credit.
            </p>
            <p>
              <span className="text-[var(--color-fg)]">Synapse</span> — maps burn, staking, and
              holder activity as a live, on-chain connectome.
            </p>
            <p>
              <span className="text-[var(--color-fg)]">Hush</span> — swaps into $INTERN from any
              supported chain, with every swap&apos;s fee cut auto-burned.
            </p>
            <p>
              <span className="text-[var(--color-fg)]">Cache</span> — deposit for yield, or post a
              tokenized stock as collateral to borrow against it.
            </p>
            <p className="pt-1">
              <Link href="/marketplace" className="text-[var(--color-accent)] hover:underline">
                Meet the full crew →
              </Link>
            </p>
          </div>
        ),
      },
      {
        q: "Do I need to stake to use them?",
        a: (
          <>
            No — most interns work off a burn, not a stake. Rendo&apos;s text-generation beta is
            the one exception, gated by your actual staked balance.
          </>
        ),
      },
      {
        q: "Are more interns coming?",
        a: (
          <>
            Yes — the roster grows as fast as real demand justifies it, not faster. See what&apos;s
            actually in progress on the{" "}
            <Link href="/roadmap" className="text-[var(--color-accent)] hover:underline">
              roadmap
            </Link>
            , or{" "}
            <Link href="/roster" className="text-[var(--color-accent)] hover:underline">
              pitch intern #7 yourself
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Staking",
    items: [
      {
        q: "How do I stake, and is there a lockup?",
        a: (
          <>
            Connect a wallet on the{" "}
            <Link href="/stake" className="text-[var(--color-accent)] hover:underline">
              stake page
            </Link>
            , approve, then stake. There&apos;s no lockup — unstake anytime, and claim your earned
            BE separately whenever you want.
          </>
        ),
      },
      {
        q: "What's the APR?",
        a: (
          <>
            Shown live on the stake page, computed from actual recorded distribution history —
            not a fixed promised number, since it depends on real trading volume.
          </>
        ),
      },
    ],
  },
  {
    title: "Cache — yield & borrow",
    items: [
      {
        q: "What can I do with Cache?",
        a: (
          <>
            Deposit USDG and earn real yield, or post a tokenized stock (TSLA or NVDA to start) as
            collateral and borrow USDG against it, or supply USDG directly and earn from real
            borrowers. Non-custodial the whole way through — whatever comes back is always yours,
            in your own wallet.{" "}
            <Link href="/cache" className="text-[var(--color-accent)] hover:underline">
              Open Cache →
            </Link>
          </>
        ),
      },
      {
        q: "What happens if my collateral drops in value?",
        a: (
          <>
            Borrowing against collateral always carries liquidation risk — if your position&apos;s
            health factor drops too low, your collateral can be liquidated. Cache&apos;s own page
            shows your live health factor and current vs. max LTV before you borrow anything, using
            the same live price your position is actually measured against.
          </>
        ),
      },
    ],
  },
  {
    title: "Security & trust",
    items: [
      {
        q: "Has $INTERN been audited?",
        a: (
          <>
            Every contract is unit-tested and reviewed in-house, including an automated security
            pass. An independent third-party audit is next. Real value already moves through these
            contracts, so verify the source yourself and stake or deposit only what you&apos;re
            comfortable with — same as any young protocol.
          </>
        ),
      },
      {
        q: "Where can I verify contract addresses myself?",
        a: (
          <>
            Every real, deployed address lives on the{" "}
            <Link href="/docs" className="text-[var(--color-accent)] hover:underline">
              docs page
            </Link>
            , each one a link straight to its verified source on Blockscout. Don&apos;t trust a
            claim here — check it there.
          </>
        ),
      },
      {
        q: "Who controls the admin functions?",
        a: <>Admin controls sit with one wallet for now, moving to shared control soon.</>,
      },
    ],
  },
];

export default function FaqView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-3xl mx-auto w-full">
        <SectionLabel>FAQ</SectionLabel>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          Questions, answered straight.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed">
          Everything below matches what&apos;s actually live on this site right now — if
          something changes, this page does too.
        </Reveal>
      </section>

      <section className="px-6 pb-24 max-w-3xl mx-auto w-full">
        {CATEGORIES.map((cat, i) => (
          <Reveal key={cat.title} delay={0.05 * i}>
            <FaqCategory title={cat.title} items={cat.items} defaultOpenFirst={i === 0} />
          </Reveal>
        ))}

        <Reveal className="border-t border-[var(--color-line)] pt-8 mt-4">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Still have a question?{" "}
            <a
              href="https://t.me/internburnxyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Ask on Telegram
            </a>{" "}
            or{" "}
            <a
              href="https://x.com/Internburn_xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              X
            </a>
            .
          </p>
        </Reveal>
      </section>
    </>
  );
}
