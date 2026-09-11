"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import PersonaIntroVideo from "../components/PersonaIntroVideo";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { CONTRACTS, isStakingLive } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../lib/abis";

// PreviewBadge/AvatarMock/TIERS/the "how it would work" tier-gated
// avatar-template section they used to back were a mockup for a
// video-avatar model that was never actually built: stake to a
// threshold, unlock templates. What shipped instead is video-credits
// (burn a flat cost per generation, any of the 4 personas incl. Rendo,
// real commissioned art, no stake gate on video specifically) -- see
// api/blaze/generate/route.js. Removed the mockup rather than relabel
// it "live," since it describes a mechanic that doesn't exist.
function LiveVideoBadge() {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      VIDEO · LIVE (BURN-BASED)
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      TEXT BETA · LIVE
    </span>
  );
}

const TIER_THRESHOLDS = [
  { name: "Full-Time Offer", min: 1_000_000, dailyLimit: 20 },
  { name: "Senior Intern", min: 100_000, dailyLimit: 8 },
  { name: "Intern", min: 10_000, dailyLimit: 3 },
];

function tierFor(staked) {
  return TIER_THRESHOLDS.find((t) => staked >= t.min) ?? null;
}

// The real, working slice of Rendo: staking-gated text generation. Reads
// the connected wallet's REAL staked balance to show tier status
// client-side (for display only -- the API route re-verifies this
// server-side before generating anything, so this can't be spoofed to
// get free generations).
function RendoTool() {
  const { address, isConnected } = useAccount();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: staked } = useReadContract({
    address: CONTRACTS.distributor,
    abi: STAKING_REWARDS_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: Boolean(address) && isStakingLive(), refetchInterval: 10000 },
  });
  const { data: decimals } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: isStakingLive() },
  });

  const stakedNumber = staked !== undefined ? Number(formatUnits(staked, decimals ?? 18)) : 0;
  const tier = tierFor(stakedNumber);

  async function handleGenerate() {
    if (!prompt.trim() || !address) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/rendo/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Couldn't reach Rendo right now — try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  if (!isStakingLive()) {
    return (
      <div className="border border-[var(--color-line)] rounded-2xl p-8 bg-[var(--color-surface)] text-center">
        <p className="text-[var(--color-muted)] text-sm">
          Rendo needs staking to be live first — check back once it is.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="border border-[var(--color-line)] rounded-2xl p-8 bg-[var(--color-surface)] text-center">
        <p className="text-[var(--color-fg)] mb-5">Connect a wallet to check your tier and try Rendo.</p>
        <div className="flex justify-center">
          <ConnectWalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-line)] rounded-2xl p-6 bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-1">YOUR STAKE</p>
          <p className="font-mono text-lg text-[var(--color-fg)]">
            {stakedNumber.toLocaleString()} $INTERN
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-1">TIER</p>
          <p className={`font-mono text-lg ${tier ? "text-[var(--color-accent)]" : "text-[var(--color-muted-2)]"}`}>
            {tier ? tier.name : "None yet"}
          </p>
        </div>
      </div>

      {!tier ? (
        <p className="text-sm text-[var(--color-muted)]">
          Stake at least 10,000 $INTERN to unlock Rendo.{" "}
          <Link href="/stake" className="text-[var(--color-accent)] hover:underline">
            Stake now →
          </Link>
        </p>
      ) : (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
            placeholder="e.g. a punchy X caption about my new NFT drop"
            rows={3}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)]/50 mb-3 resize-none"
          />
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] text-[var(--color-muted-2)]">
              {tier.dailyLimit} generations/day at your tier · {prompt.length}/500
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-xs font-medium px-5 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
            >
              {loading ? "GENERATING…" : "GENERATE"}
            </button>
          </div>

          {error && (
            <p className="font-mono text-xs text-[var(--color-danger)] mb-3 leading-relaxed">{error}</p>
          )}
          {result && (
            <div className="border border-[var(--color-line)] rounded-xl p-4 bg-[var(--color-bg)]">
              <p className="whitespace-pre-wrap text-sm text-[var(--color-fg)] leading-relaxed mb-3">
                {result.text}
              </p>
              <p className="font-mono text-[10px] text-[var(--color-muted-2)]">
                {result.usedToday}/{result.dailyLimit} used today
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PersonasView() {
  return (
    <>
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-3 mb-4 flex-wrap">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
            MEET RENDO · MEDIA INTERN
          </p>
          <LiveBadge />
          <LiveVideoBadge />
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Your own digital intern, for content creation.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-4"
        >
          Stake $INTERN, unlock Rendo&apos;s text-generation beta below —
          captions, post ideas, short scripts, gated by your actual
          staked balance. Real video generation is also live now, burn-
          based rather than stake-gated, covering all four interns
          (Rendo included) — head to{" "}
          <Link href="/video-credits" className="text-[var(--color-accent)] hover:underline">
            video-credits
          </Link>{" "}
          to try it.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[var(--color-muted-2)] text-sm max-w-2xl">
          Beta means beta: usage limits are tracked server-side but not
          yet backed by a persisted database, so counts can reset on
          deploys. The stake check itself is real and can&apos;t be
          spoofed. See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/digital-intern-avatars-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what's built vs. still planned.
        </Reveal>
      </section>

      <section className="px-6 pb-10 max-w-3xl mx-auto w-full">
        <Reveal delay={0.2}>
          <PersonaIntroVideo
            src="/personas/videos/rendo-intro.mp4"
            poster="/personas/rendo.png"
            label="Rendo idle animation"
          />
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <RendoTool />
      </section>

      <section className="px-6 py-20 border-t border-[var(--color-line)] max-w-5xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
          HOW VIDEO ACTUALLY WORKS
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-4">
          Burn, generate, post.
        </Reveal>
        <Reveal as="p" delay={0.08} className="text-[var(--color-muted)] text-sm max-w-2xl mb-10">
          Not stake-gated templates — burn $INTERN for real video credit,
          same as the rest of this site&apos;s burn mechanics. Works for
          all four interns, not just Rendo.
        </Reveal>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          {[
            {
              n: "01",
              title: "Burn $INTERN",
              body: "Burn at the live price for real, spend-capped video credit — a real, irreversible on-chain transfer, tracked on-site.",
            },
            {
              n: "02",
              title: "Pick a persona, scene, or your own prompt",
              body: "Any of the 4 interns in Studio or Beach, via Runway or HeyGen — or skip the character entirely with a custom text-to-video prompt.",
            },
            {
              n: "03",
              title: "Generate, then download",
              body: "A real provider call runs server-side. Finished clips show up in your own generation history — download what you want to keep.",
            },
          ].map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="border border-[var(--color-line)] p-6">
              <p className="font-mono text-xs text-[var(--color-muted-2)] mb-4">{step.n}</p>
              <h3 className="text-lg font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-10 bg-[var(--color-surface)]">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-widest mb-3">
            TEXT BETA LIVE · VIDEO LIVE (BURN-BASED)
          </p>
          <p className="text-[var(--color-fg)] text-lg mb-6 max-w-xl mx-auto">
            Try the text beta above, or go generate real video right now —
            no stake required for video, just a burn. Custom prompts
            (no character at all) are live too.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <Link
              href="/video-credits"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              GENERATE VIDEO →
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/stake"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
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
