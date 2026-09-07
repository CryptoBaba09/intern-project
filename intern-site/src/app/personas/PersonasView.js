"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { CONTRACTS, isStakingLive } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../lib/abis";

function AvatarMock({ gradient, label }) {
  return (
    <div
      className={`aspect-[3/4] rounded-2xl ${gradient} relative overflow-hidden border border-[#1B1D1B] flex items-end p-4`}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full opacity-[0.15]"
        aria-hidden
      >
        <circle cx="50" cy="38" r="18" fill="#EDEEF0" />
        <path d="M14 100 C14 70 30 58 50 58 C70 58 86 70 86 100 Z" fill="#EDEEF0" />
      </svg>
      <span className="font-mono text-[9px] tracking-widest text-[#EDEEF0]/70 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
        {label}
      </span>
    </div>
  );
}

const TIERS = [
  {
    name: "Intern",
    stake: "10,000",
    gradient: "bg-gradient-to-br from-[#0F1113] to-[#1B1D1B]",
    perks: ["1 avatar template", "Basic monthly video credits", "Standard render queue"],
  },
  {
    name: "Senior Intern",
    stake: "100,000",
    gradient: "bg-gradient-to-br from-[#0F1113] via-[#122015] to-[#1B1D1B]",
    perks: ["More templates", "Higher credit allowance", "Voice customization (planned)"],
  },
  {
    name: "Full-Time Offer",
    stake: "1,000,000",
    gradient: "bg-gradient-to-br from-[#16120A] via-[#1c160e] to-[#1B1D1B]",
    perks: ["Full customization", "Highest credit allowance", "Priority render queue"],
  },
];

function PreviewBadge() {
  return (
    <span className="font-mono text-[10px] text-[#D9A441] border border-[#D9A441]/30 rounded-full px-2.5 py-1 tracking-widest">
      VIDEO AVATARS · NOT LIVE
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="font-mono text-[10px] text-[#00C805] border border-[#00C805]/30 rounded-full px-2.5 py-1 tracking-widest">
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
      <div className="border border-[#1B1D1B] rounded-2xl p-8 bg-[#0F1113] text-center">
        <p className="text-[#9BA1A6] text-sm">
          Rendo needs staking to be live first — check back once it is.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="border border-[#1B1D1B] rounded-2xl p-8 bg-[#0F1113] text-center">
        <p className="text-[#EDEEF0] mb-5">Connect a wallet to check your tier and try Rendo.</p>
        <div className="flex justify-center">
          <ConnectWalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#1B1D1B] rounded-2xl p-6 bg-[#0F1113]">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-1">YOUR STAKE</p>
          <p className="font-mono text-lg text-[#EDEEF0]">
            {stakedNumber.toLocaleString()} $INTERN
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-1">TIER</p>
          <p className={`font-mono text-lg ${tier ? "text-[#00C805]" : "text-[#4A4F54]"}`}>
            {tier ? tier.name : "None yet"}
          </p>
        </div>
      </div>

      {!tier ? (
        <p className="text-sm text-[#9BA1A6]">
          Stake at least 10,000 $INTERN to unlock Rendo.{" "}
          <Link href="/stake" className="text-[#00C805] hover:underline">
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
            className="w-full bg-[#0B0C0B] border border-[#1B1D1B] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#00C805]/50 mb-3 resize-none"
          />
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] text-[#4A4F54]">
              {tier.dailyLimit} generations/day at your tier · {prompt.length}/500
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-xs font-medium px-5 py-2.5 hover:bg-[#00b304] transition-colors disabled:opacity-40"
            >
              {loading ? "GENERATING…" : "GENERATE"}
            </button>
          </div>

          {error && (
            <p className="font-mono text-xs text-[#E5484D] mb-3 leading-relaxed">{error}</p>
          )}
          {result && (
            <div className="border border-[#1B1D1B] rounded-xl p-4 bg-[#0B0C0B]">
              <p className="whitespace-pre-wrap text-sm text-[#EDEEF0] leading-relaxed mb-3">
                {result.text}
              </p>
              <p className="font-mono text-[10px] text-[#4A4F54]">
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
          <p className="font-mono text-xs text-[#00C805] tracking-widest">
            MEET RENDO · MEDIA INTERN
          </p>
          <LiveBadge />
          <PreviewBadge />
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Your own digital intern, for content creation.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[#9BA1A6] text-lg leading-relaxed max-w-2xl mb-4"
        >
          Stake $INTERN, unlock Rendo. The text-generation beta below is
          real and working today — captions, post ideas, short scripts,
          gated by your actual staked balance. The full AI video avatar
          vision is still planned, not live yet.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[#4A4F54] text-sm max-w-2xl">
          Beta means beta: usage limits are tracked server-side but not
          yet backed by a persisted database, so counts can reset on
          deploys. The stake check itself is real and can&apos;t be
          spoofed. See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/digital-intern-avatars-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C805] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what's built vs. still planned.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <RendoTool />
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <p className="font-mono text-[10px] text-[#4A4F54] mb-6 max-w-2xl leading-relaxed">
          These same three stake thresholds already gate the real text
          beta above. The perks below — avatar templates, video credits —
          are the planned full vision, not live yet.
        </p>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6"
        >
          {TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="border border-[#1B1D1B] p-5"
            >
              <AvatarMock gradient={tier.gradient} label="MOCKUP" />
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-1">{tier.name}</h3>
                <p className="font-mono text-xs text-[#D9A441] mb-4">
                  {tier.stake} $INTERN staked
                </p>
                <ul className="space-y-2">
                  {tier.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2 text-sm text-[#9BA1A6]"
                    >
                      <span className="text-[#00C805] mt-0.5">→</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 py-20 border-t border-[#1B1D1B] max-w-5xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
          HOW IT WOULD WORK
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
          Stake, generate, post.
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
              title: "Stake $INTERN",
              body: "Reach a tier threshold in the InternStakingRewards contract you're already earning BE from.",
            },
            {
              n: "02",
              title: "Generate",
              body: "Pick a template, write a script, and generate a video with your digital intern.",
            },
            {
              n: "03",
              title: "Post it",
              body: "Download and post — no watermark hassle at higher tiers, more usage the higher you stake.",
            },
          ].map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="border border-[#1B1D1B] p-6">
              <p className="font-mono text-xs text-[#4A4F54] mb-4">{step.n}</p>
              <h3 className="text-lg font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-[#9BA1A6] leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[#1B1D1B] rounded-2xl p-10 bg-[#0F1113]">
          <p className="font-mono text-xs text-[#9BA1A6] tracking-widest mb-3">
            TEXT BETA LIVE · VIDEO STILL PLANNED
          </p>
          <p className="text-[#EDEEF0] text-lg mb-6 max-w-xl mx-auto">
            Try the real thing above. Full AI video avatars ship once
            there's a real generation provider picked and budgeted — follow
            the{" "}
            <Link href="/roadmap" className="text-[#00C805] hover:underline">
              roadmap
            </Link>{" "}
            for status.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/stake"
              className="inline-block rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium px-6 py-3 hover:bg-[#00b304] transition-colors"
            >
              GO TO STAKING →
            </Link>
            <Link
              href="/marketplace"
              className="inline-block rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium px-6 py-3 hover:border-[#00C805]/50 transition-colors"
            >
              MEET THE OTHER INTERNS →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
