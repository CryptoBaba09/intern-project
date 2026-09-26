"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import AnimatedNumber from "../components/AnimatedNumber";
import { CONTRACTS, DEAD_ADDRESS, isTradingLive } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";

const ROUND3_START = "Sep 26, 2026";
const ROUND3_END = "Oct 3, 2026";

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
          $INTERN burned protocol-wide, live.
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

function useEntryCount() {
  const [count, setCount] = useState(null);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/burn-to-create/submit")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCount(data.count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bump]);
  return [count, () => setBump((b) => b + 1)];
}

function EntryForm({ onSubmitted }) {
  const [videoLink, setVideoLink] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/burn-to-create/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoLink, wallet, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStatus("done");
      setVideoLink("");
      setWallet("");
      setNote("");
      onSubmitted?.();
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  if (status === "done") {
    return (
      <div className="border border-[var(--color-accent)]/30 rounded-2xl p-8 text-center">
        <p className="text-lg font-medium mb-2">Entry logged.</p>
        <p className="text-sm text-[var(--color-muted)]">
          The team reviews entries by hand — no automatic judging. The top 5 win tokenized
          stock rewards, picked after {ROUND3_END}.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 font-mono text-sm text-[var(--color-accent)] hover:underline"
        >
          SUBMIT ANOTHER ENTRY →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[var(--color-line)] rounded-2xl p-8 space-y-4">
      <div>
        <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
          YOUR VIDEO LINK *
        </label>
        <input
          value={videoLink}
          onChange={(e) => setVideoLink(e.target.value)}
          maxLength={500}
          required
          placeholder="X post, or a direct link — generation URLs can expire, so a post is safer"
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
        />
      </div>
      <div>
        <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
          WALLET THAT BURNED FOR IT *
        </label>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          required
          placeholder="0x..."
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
        />
      </div>
      <div>
        <label className="block font-mono text-xs text-[var(--color-muted)] mb-2">
          NOTE (OPTIONAL)
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Anything you want the team to know"
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50"
        />
      </div>
      {status === "error" && <p className="text-sm text-[var(--color-ember)]">{error}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
      >
        {status === "submitting" ? "SUBMITTING..." : "SUBMIT YOUR ENTRY →"}
      </button>
    </form>
  );
}

export default function BurnToCreateView() {
  const [count, bump] = useEntryCount();

  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          BURN TO CREATE · ROUND 3 · {ROUND3_START} – {ROUND3_END}
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6">
          Burn $INTERN. Make a meme with an intern. Win stock.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-6">
          Buy back and burn $INTERN, then make any video that features our interns — Blaze,
          Rendo, Promptly, Synapse, Hush or Cache. Any tool works. Post it on X, tag
          @InternburnHQ, and the top 5 entries win tokenized stock rewards.
        </Reveal>
        <Reveal delay={0.15}>
          <LiveBurnStrip />
        </Reveal>
        <Reveal delay={0.18} className="font-mono text-xs text-[var(--color-muted-2)] mt-3">
          {count === null ? "..." : count} entr{count === 1 ? "y" : "ies"} submitted so far
        </Reveal>
        <Reveal delay={0.2} className="flex flex-wrap gap-4 mt-8">
          <Link
            href="/video-credits"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            BURN &amp; CREATE →
          </Link>
          <a
            href="https://x.com/InternburnHQ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
          >
            FOLLOW FOR WINNERS ↗
          </a>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          HOW IT WORKS
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-8">
          Three real steps, nothing simulated.
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
            body="Buy back and burn at least $5 of $INTERN — through Video Credits on the site, or by sending it to the dead address. Keep the transaction hash."
          />
          <StepCard
            n="02"
            title="Create"
            body="Make any video that features our interns. Any tool, any style — but the intern has to be in it to be eligible."
          />
          <StepCard
            n="03"
            title="Submit"
            body={`Post it on X, tag @InternburnHQ with your wallet and burn transaction, then submit the link below. Entries close ${ROUND3_END}.`}
          />
        </motion.div>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          THE PRIZE
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-3">
          Top 5 win tokenized stocks.
        </Reveal>
        <Reveal as="p" delay={0.08} className="text-[var(--color-muted)] text-sm leading-relaxed max-w-2xl mb-6">
          The prize pool is 0.5% of everything entrants burn during the round, so the more the
          community burns, the bigger it gets. It is split 40 / 25 / 15 / 10 / 10 across the top
          5 and paid in the tokenized stock of your choice — TSLA, NVDA, SPCX or BE. Places unlock
          as the pool grows: 1st only under $25, the top 3 up to $99, the top 5 from $100. The
          team still judges by hand, on creativity, how well the interns are used, and reach.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-3xl"
        >
          <StepCard n="1ST" title="40%" body="of the pool" />
          <StepCard n="2ND" title="25%" body="of the pool" />
          <StepCard n="3RD" title="15%" body="of the pool" />
          <StepCard n="4TH" title="10%" body="of the pool" />
          <StepCard n="5TH" title="10%" body="of the pool" />
        </motion.div>
        <Reveal delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed max-w-2xl mt-6">
          Standout entries outside the top 5 also get pinned on X and Telegram, credited by name or
          handle. And separately from this contest: the moment $INTERN crosses{" "}
          <Link href="/genesis" className="text-[var(--color-accent)] hover:underline">
            $1,000,000 in real cumulative trading volume
          </Link>
          , 500 Genesis Intern NFTs unlock for anyone to mint — one more reason every burn here
          helps everyone, not just the top 5.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          ENTER
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-8">
          Already burned and posted? Submit it.
        </Reveal>
        <Reveal delay={0.1}>
          <EntryForm onSubmitted={bump} />
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto w-full">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-8 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4">
            THE HONEST FINE PRINT
          </p>
          <ul className="space-y-3 text-sm text-[var(--color-muted)] leading-relaxed list-disc pl-5">
            <li>
              Judged by the team on creativity and quality, not entry volume — manual and
              subjective, because there isn&apos;t a fair automated way to do it yet.
            </li>
            <li>One entry per wallet counts toward winning — only your best entry is judged. One prize per person: wallets that pass tokens between each other count as one entrant.</li>
            <li>
              A $5 minimum burn applies, and the prize pool is 0.5% of the $INTERN burned by
              entrants during the round, valued at the time of each burn.
            </li>
            <li>
              This is a promotional contest, not an investment: winning doesn&apos;t imply anything
              about $INTERN&apos;s future price, and entering doesn&apos;t either.
            </li>
            <li>
              Every burn happens on-chain regardless of the outcome — verify it yourself on
              Blockscout, same as everything else on this site.
            </li>
          </ul>
        </Reveal>
      </section>

      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-muted-2)] tracking-widest mb-3">
          PREVIOUS ROUNDS
        </Reveal>
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-6">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Round 1 (Sep 7–11, 2026) matched every entry&apos;s burn on-chain as promised. Round 2
            entries already submitted are still judged under Round 2&apos;s terms; Round 3 above
            replaces it for everything new.
          </p>
        </Reveal>
      </section>
    </>
  );
}
