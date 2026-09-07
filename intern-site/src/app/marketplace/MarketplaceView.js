"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";

const INTERNS = [
  {
    name: "Blaze",
    role: "Burn Tracker Intern",
    status: "LIVE",
    body: "The protocol's own burn engine — no deploy, no fee, nothing to buy. Every time creator fees are claimed off the $INTERN/BE pool, 70% is bought back and burned automatically, starting from $INTERN's first trade.",
    fee: "Autonomous — 70% of every fee claim burned, no user action needed",
    href: null,
  },
  {
    name: "Rendo",
    role: "Media Intern",
    status: "BETA LIVE",
    body: "Real text-generation beta is live today, gated by your actual staked balance — captions, post ideas, scripts. The full AI video avatar vision is still in design, not live yet.",
    fee: "Free within your tier's daily limit — no per-generation fee yet",
    href: "/personas",
  },
  {
    name: "Promptly",
    role: "Inference Intern",
    status: "TOP-UP LIVE",
    body: "The instant top-up is real and live today: burn $INTERN at the live price, get a real spend-capped OpenRouter key — Claude, GPT, Gemini and more. Routing staked $INTERN into a treasury-funded credit pool is still in design; it needs real fee revenue flowing first.",
    fee: "Burn $INTERN for an instant top-up (live) — free via staking (not live yet)",
    href: "/inference-credits",
  },
  {
    name: "Perky",
    role: "Rewards Intern",
    status: "IN DESIGN",
    body: "Not a hire — a perk. Stake past a threshold and Perky adds a tiered bonus on top of your core BE distribution, funded separately from the treasury. No fee, because there's nothing to buy.",
    fee: "No fee — a staking perk, not a paid service",
    href: null,
  },
  {
    name: "Div",
    role: "Dividends Intern",
    status: "BLOCKED",
    body: "The idea: point your claimed BE at DRIP — a real, live protocol on Robinhood Chain — to route out any hidden dividend value. Checked against reality (2026-09-07): BE doesn't pay a real-world dividend today, and DRIP doesn't list it as a supported asset. There's nothing for Div to route yet. Not a build queue item — blocked on Bloom Energy actually paying a dividend first, not on us.",
    fee: "N/A — blocked on a real-world precondition, not an engineering one",
    href: "https://dripswap.tech",
    external: true,
  },
  {
    name: "Forge",
    role: "Custom Build Intern",
    status: "IN DESIGN",
    body: "Bring your own intern — payments, writing, automations, or anything else you can spec. A one-time $INTERN fee forges it; a minimum staked balance keeps it running. Drop below the minimum and it pauses until you top back up.",
    fee: "10,000 $INTERN one-time (burned) + 50,000 $INTERN staked, ongoing",
    href: null,
  },
];

function StatusBadge({ status }) {
  return (
    <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5 shrink-0">
      {status}
    </span>
  );
}

function InternCard({ intern }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold">{intern.name}</h3>
          <p className="font-mono text-xs text-[#D9A441] mt-0.5">{intern.role}</p>
        </div>
        <StatusBadge status={intern.status} />
      </div>
      <p className="text-sm text-[#9BA1A6] leading-relaxed mb-4">{intern.body}</p>
      <p className="font-mono text-[10px] text-[#00C805] border-t border-[#1B1D1B] pt-3">
        {intern.fee}
      </p>
      {intern.href && (
        <p className="font-mono text-xs text-[#EDEEF0] mt-4">
          {intern.external ? "Visit DRIP ↗" : "See details →"}
        </p>
      )}
    </>
  );

  const cardClass =
    "border border-[#1B1D1B] p-6 h-full transition-colors hover:bg-white/[0.03]";

  if (intern.external) {
    return (
      <a href={intern.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
        {content}
      </a>
    );
  }
  if (intern.href) {
    return (
      <Link href={intern.href} className={cardClass}>
        {content}
      </Link>
    );
  }
  return <div className={cardClass}>{content}</div>;
}

export default function MarketplaceView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-6xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
          MARKETPLACE
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Hire an intern. Burn some $INTERN.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[#9BA1A6] text-lg leading-relaxed max-w-2xl"
        >
          The goal isn&apos;t one token you hold and hope. It&apos;s a place
          people come to actually build and run agents — where every real
          utility spends $INTERN, and that spend burns supply or rewards
          the people staking it. One is live today. The rest are being
          built in the open — check each one&apos;s real status before you
          plan around it.
        </Reveal>
      </section>

      <section className="px-6 pb-20 max-w-6xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {INTERNS.map((intern) => (
            <motion.div key={intern.name} variants={fadeUp} whileHover={{ y: -4 }}>
              <InternCard intern={intern} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto w-full">
        <Reveal className="border border-[#1B1D1B] rounded-2xl p-10 text-center bg-[#0F1113]">
          <p className="font-mono text-xs text-[#D9A441] tracking-widest mb-3">
            MORE UTILITY-DRIVEN INTERNS, COMING
          </p>
          <p className="text-[#EDEEF0] text-lg max-w-xl mx-auto mb-6">
            The roster grows as fast as real demand justifies it — not
            faster. Every new hire gets the same rule: real utility, a
            real $INTERN fee, or it doesn&apos;t launch.
          </p>
          <Link
            href="/roadmap"
            className="inline-block rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium px-6 py-3 hover:border-[#00C805]/50 transition-colors"
          >
            SEE THE FULL ROADMAP →
          </Link>
        </Reveal>
      </section>
    </>
  );
}
