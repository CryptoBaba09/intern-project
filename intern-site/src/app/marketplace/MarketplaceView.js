"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import InternFamilyScene from "../components/InternFamilyScene";

const INTERNS = [
  {
    name: "Blaze",
    role: "Burn Tracker Intern",
    icon: "/personas/blaze-icon.png",
    status: "LIVE",
    body: "The protocol's own burn engine — no deploy, no fee, nothing to buy. Every time creator fees are claimed off the $INTERN/BE pool, 70% is bought back and burned automatically, starting from $INTERN's first trade.",
    fee: "Autonomous — 70% of every fee claim burned, no user action needed",
    href: "/blaze",
  },
  {
    name: "Rendo",
    role: "Media Intern",
    icon: "/personas/rendo-icon.png",
    status: "LIVE",
    body: "Text-generation beta is live, gated by your actual staked balance — captions, post ideas, scripts. Real video generation is also live now, burn-based (any of the 4 interns, or a fully custom prompt) rather than stake-gated — see video-credits.",
    fee: "Text: free within your tier's daily limit. Video: $1.50 of burned $INTERN per generation.",
    href: "/personas",
  },
  {
    name: "Promptly",
    role: "Inference Intern",
    icon: "/personas/promptly-icon.png",
    status: "TOP-UP LIVE",
    body: "The instant top-up is real and live today: burn $INTERN at the live price, get a real spend-capped OpenRouter key — Claude, GPT, Gemini and more. Routing staked $INTERN into a treasury-funded credit pool is still in design; it needs real fee revenue flowing first.",
    fee: "Burn $INTERN for an instant top-up (live) — free via staking (not live yet)",
    href: "/inference-credits",
  },
  {
    name: "Synapse",
    role: "Research Intern",
    icon: "/personas/synapse-icon.png",
    status: "NEW",
    body: "The newest hire. Maps burn history, staking flow, and (once there's an indexer) holder activity as a literal connectome — v1 is live now, real numbers, no fee.",
    fee: "Free — the connectome view has no fee planned. Its video-credit avatar option burns $1.50 of $INTERN per generation, same as every other persona.",
    href: "/synapse",
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
    icon: "/personas/forge-icon.png",
    status: "IN DESIGN",
    body: "Bring your own intern — payments, writing, automations, or anything else you can spec. A one-time $INTERN fee forges it; a minimum staked balance keeps it running. Drop below the minimum and it pauses until you top back up.",
    fee: "10,000 $INTERN one-time (burned) + 50,000 $INTERN staked, ongoing",
    href: null,
  },
];

function StatusBadge({ status }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5 shrink-0">
      {status}
    </span>
  );
}

function InternCard({ intern }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {intern.icon && (
            <Image
              src={intern.icon}
              alt={`${intern.name} icon`}
              width={44}
              height={44}
              className="rounded-full border border-[var(--color-line)] shrink-0"
            />
          )}
          <div>
            <h3 className="text-xl font-semibold">{intern.name}</h3>
            <p className="font-mono text-xs text-[var(--color-ember)] mt-0.5">{intern.role}</p>
          </div>
        </div>
        <StatusBadge status={intern.status} />
      </div>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">{intern.body}</p>
      <p className="font-mono text-[10px] text-[var(--color-accent)] border-t border-[var(--color-line)] pt-3">
        {intern.fee}
      </p>
      {intern.href && (
        <p className="font-mono text-xs text-[var(--color-fg)] mt-4">
          {intern.external ? "Visit DRIP ↗" : "See details →"}
        </p>
      )}
    </>
  );

  const cardClass =
    "border border-[var(--color-line)] p-6 h-full transition-colors hover:bg-white/[0.03]";

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
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          MARKETPLACE
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Hire an intern. Burn some $INTERN.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl"
        >
          The goal isn&apos;t one token you hold and hope. It&apos;s a place
          people come to actually build and run agents — where every real
          utility spends $INTERN, and that spend burns supply or rewards
          the people staking it. Three are live today, in different
          forms. The rest are being built in the open — check each
          one&apos;s real status before you plan around it.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-6xl mx-auto w-full">
        <Reveal>
          <InternFamilyScene
            title="TAP A FACE TO SEE WHAT THEY'RE UP TO"
            subtitle="Every stat below is read live from the chain, not self-reported."
          />
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
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 text-center bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-ember)] tracking-widest mb-3">
            MORE UTILITY-DRIVEN INTERNS, COMING
          </p>
          <p className="text-[var(--color-fg)] text-lg max-w-xl mx-auto mb-6">
            The roster grows as fast as real demand justifies it — not
            faster. Every new hire gets the same rule: real utility, a
            real $INTERN fee, or it doesn&apos;t launch.
          </p>
          <Link
            href="/roadmap"
            className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            SEE THE FULL ROADMAP →
          </Link>
        </Reveal>
      </section>
    </>
  );
}
