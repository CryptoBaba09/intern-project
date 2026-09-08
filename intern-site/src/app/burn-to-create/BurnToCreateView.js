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
const END_DATE = "Sep 21, 2026";

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
          $INTERN burned so far, protocol-wide — this campaign adds to that real number, live.
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
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          LIMITED-TIME CAMPAIGN · {START_DATE} – {END_DATE}
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          Burn to Create.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-6">
          Burn $INTERN through Promptly, use the real AI credit you get to
          make something about $INTERN, and submit it. Every entry is a
          real burn — no wash trading, no fake engagement, just real usage
          of a feature we shipped this week.
        </Reveal>
        <Reveal delay={0.15}>
          <LiveBurnStrip />
        </Reveal>
        <Reveal delay={0.2} className="flex flex-wrap gap-4 mt-8">
          <Link
            href="/inference-credits"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            BURN & START →
          </Link>
          <a
            href="https://x.com/Internburn_xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            SUBMIT ON X ↗
          </a>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          HOW IT WORKS
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-8">
          Three real steps, no gimmicks.
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
            body="Burn any amount of $INTERN through Promptly that clears the real $0.10 minimum. You get back a real, spend-capped OpenRouter key."
          />
          <StepCard
            n="02"
            title="Create"
            body="Spend that credit on Claude, GPT, Gemini, or whatever else OpenRouter connects to. Make a meme, a thread, a graphic, a script — anything about $INTERN."
          />
          <StepCard
            n="03"
            title="Submit"
            body={`Reply to the pinned campaign post on X or Telegram with your creation and your burn transaction hash. Entries close ${END_DATE}.`}
          />
        </motion.div>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          PRIZES
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-3">
          Top 5 entries win three things.
        </Reveal>
        <Reveal as="p" delay={0.08} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          Sent directly from the founder&apos;s wallet, on-chain, disclosed
          as such — not an automated treasury payout. At $INTERN&apos;s
          current price this isn&apos;t a life-changing cash prize, and we&apos;re
          not going to pretend otherwise. What it is: a real stake in
          $INTERN&apos;s history, matched to what you actually put in.
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
              One entry per wallet counts toward winning, but you can burn
              and submit as many times as you want — only your best entry
              is judged.
            </li>
            <li>
              This is a promotional contest, not an investment: winning
              doesn&apos;t imply anything about $INTERN&apos;s future price, and
              entering doesn&apos;t either.
            </li>
            <li>
              Every burn happens on-chain regardless of whether you win —
              verify it yourself on Blockscout, same as everything else on
              this site.
            </li>
          </ul>
        </Reveal>
      </section>
    </>
  );
}
