"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import AnimatedNumber from "../components/AnimatedNumber";
import { CONTRACTS, DEAD_ADDRESS, isTradingLive } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";

const START_DATE = "Sep 7, 2026";
const END_DATE = "Sep 11, 2026";

function LiveBurnStrip() {
  const { data: burnedRaw } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [DEAD_ADDRESS],
    query: { enabled: isTradingLive(), refetchInterval: 15000 },
  });
  const { data: decimals } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: isTradingLive() },
  });

  const burned = burnedRaw !== undefined ? Number(formatUnits(burnedRaw, decimals ?? 18)) : null;

  return (
    <p className="font-mono text-xs text-[var(--color-muted)] flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ember-pulse" />
      {burned === null ? (
        "Reading live burn total…"
      ) : (
        <>
          <span className="text-[var(--color-fg)]">
            <AnimatedNumber value={Math.round(burned)} />
          </span>{" "}
          $INTERN burned protocol-wide, live — this stays permanent no matter what pool it trades on.
        </>
      )}
    </p>
  );
}

function StepCard({ n, title, body }) {
  return (
    <motion.div variants={fadeUp} className="border border-[var(--color-line)] p-6">
      <p className="font-mono text-xs text-[var(--color-muted-2)] mb-4">{n}</p>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{body}</p>
    </motion.div>
  );
}

function PrizeCard({ title, body, accent }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="border border-[var(--color-line)] p-6 bg-[var(--color-surface)]"
    >
      <h3 className={`text-lg font-semibold mb-2 ${accent ? "text-[var(--color-ember)]" : "text-[var(--color-fg)]"}`}>
        {title}
      </h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{body}</p>
    </motion.div>
  );
}

export default function BurnToCreateView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-ember)] tracking-widest mb-3">
          CAMPAIGN CLOSED · {START_DATE} – {END_DATE}
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          Burn to Create is closed.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-4">
          Closed early, on purpose — not quietly. Pair.fund&apos;s trading
          route for $INTERN has been broken for days despite direct
          escalation, so we&apos;re migrating to a new pool instead of
          running a campaign on top of a broken one.
        </Reveal>
        <Reveal as="p" delay={0.13} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-6">
          Every entry already submitted is honored in full — the 5x burn
          match is still paid, on-chain, from the founder wallet, exactly
          as promised. See the migration announcement for what&apos;s next.
        </Reveal>
        <Reveal delay={0.15}>
          <LiveBurnStrip />
        </Reveal>
        <Reveal delay={0.2} className="flex flex-wrap gap-4 mt-8">
          <a
            href="https://x.com/Internburn_xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            READ THE MIGRATION ANNOUNCEMENT ↗
          </a>
          <Link
            href="/inference-credits"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            TRY PROMPTLY →
          </Link>
          <Link
            href="/video-credits"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            TRY VIDEO CREDITS →
          </Link>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          WHAT HAPPENED
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-8">
          Three real steps, no gimmicks — still true.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          <StepCard
            n="01"
            title="Burn"
            body="Burn any amount of $INTERN through Promptly that clears the real $0.10 minimum. You get back a real, spend-capped OpenRouter key — this still works, and keeps working."
          />
          <StepCard
            n="02"
            title="Create"
            body="Spend that credit on Claude, GPT, Gemini, or whatever else OpenRouter connects to — or burn for video credit instead and animate Blaze, Rendo, or Promptly directly via Runway or HeyGen."
          />
          <StepCard
            n="03"
            title="Submitted"
            body={`Entries closed ${END_DATE}. If you already replied with your creation and burn transaction hash, you're in — judged as promised, prizes paid as promised.`}
          />
        </motion.div>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          PRIZES — STILL HONORED
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-3">
          Top 5 entries win three things.
        </Reveal>
        <Reveal as="p" delay={0.08} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          Sent directly from the founder&apos;s wallet, on-chain, disclosed
          as such — not an automated treasury payout. Closing the campaign
          early doesn&apos;t change what was promised to anyone who already
          entered.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          <PrizeCard
            title="5x burn match"
            accent
            body="Whatever you burned to enter, we send back 5x in fresh $INTERN, on-chain, to the wallet that burned it."
          />
          <PrizeCard
            title="Genesis whitelist"
            body="A guaranteed Genesis Intern NFT whitelist spot once minting unlocks at $1M real volume — see the live progress on the Genesis page."
          />
          <PrizeCard
            title="Featured, for real"
            body="Winning entries pinned on X and Telegram, credited by name or handle. Not a vague 'shoutout' — an actual pin."
          />
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-8 sm:p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4">
            THE HONEST FINE PRINT
          </p>
          <ul className="space-y-3 text-sm text-[var(--color-muted)] leading-relaxed list-disc pl-5">
            <li>
              Judged by the team on creativity and quality, not entry
              volume — this is manual and subjective, not an algorithm,
              because there isn&apos;t a fair automated way to do it yet.
            </li>
            <li>
              One entry per wallet counts toward winning. If you submitted
              more than one before close, only your best entry is judged.
            </li>
            <li>
              This was a promotional contest, not an investment: winning
              doesn&apos;t imply anything about $INTERN&apos;s future price, and
              entering didn&apos;t either.
            </li>
            <li>
              Every burn happened on-chain regardless of the outcome —
              verify it yourself on Blockscout, same as everything else on
              this site.
            </li>
          </ul>
        </Reveal>
      </section>
    </>
  );
}
