"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";

function PreviewBadge() {
  return (
    <span className="font-mono text-[10px] text-[#D9A441] border border-[#D9A441]/30 rounded-full px-2.5 py-1 tracking-widest">
      PREVIEW · NOT LIVE
    </span>
  );
}

const MODELS = ["Claude", "GPT", "Gemini", "DeepSeek", "Kimi", "+ more via OpenRouter"];

function MockDashboard() {
  return (
    <div className="w-full max-w-md border border-[#1B1D1B] rounded-2xl bg-[#0F1113] p-6">
      <div className="flex items-center justify-between mb-5">
        <span className="font-mono text-xs text-[#9BA1A6] tracking-wide">
          YOUR CREDIT BALANCE
        </span>
        <span className="font-mono text-[10px] text-[#D9A441] border border-[#D9A441]/30 rounded-full px-2 py-0.5">
          MOCKUP
        </span>
      </div>
      <p className="font-mono text-5xl text-[#EDEEF0] mb-1">$0.00</p>
      <p className="font-mono text-xs text-[#4A4F54] mb-6">
        Accrues from staked $INTERN once live
      </p>
      <button
        disabled
        className="w-full rounded-xl border border-[#1B1D1B] text-[#4A4F54] font-mono text-sm font-medium py-3 cursor-not-allowed"
      >
        CLAIM OPENROUTER KEY
      </button>
      <p className="mt-4 font-mono text-[10px] text-[#4A4F54] leading-relaxed">
        Provisions a real, spend-capped OpenRouter key. Point your editor,
        agent, or code at it — no wrapper, nothing to install.
      </p>
    </div>
  );
}

export default function InferenceCreditsView() {
  return (
    <>
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-3 mb-4">
          <p className="font-mono text-xs text-[#00C805] tracking-widest">
            MEET PROMPTLY · INFERENCE INTERN
          </p>
          <PreviewBadge />
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          Stake $INTERN. Earn AI credits.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[#9BA1A6] text-lg leading-relaxed max-w-2xl mb-4"
        >
          Staked $INTERN would earn a pro-rata share of real LLM inference
          credit from Promptly — spendable on Claude, GPT, Gemini, and
          hundreds of other models via OpenRouter, funded by treasury
          fees. Need credit right now instead of waiting on your stake?
          Pay $INTERN directly for an instant top-up — burned on the spot.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[#4A4F54] text-sm max-w-2xl">
          Nothing on this page is live. The dashboard below is a mockup.
          See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/inference-credits-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C805] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what this actually requires before it can ship.
        </Reveal>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-10 items-start">
        <MockDashboard />
        <div className="flex-1">
          <p className="font-mono text-xs text-[#9BA1A6] tracking-widest mb-4">
            WORKS WITH
          </p>
          <div className="flex flex-wrap gap-2">
            {MODELS.map((m) => (
              <span
                key={m}
                className="font-mono text-xs text-[#EDEEF0] border border-[#1B1D1B] rounded-full px-3 py-1.5"
              >
                {m}
              </span>
            ))}
          </div>
          <p className="text-sm text-[#9BA1A6] leading-relaxed mt-6 max-w-md">
            The key you'd claim is a plain OpenRouter API key with a spend
            cap — whatever already works with OpenRouter works unchanged,
            no proprietary SDK.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 border-t border-[#1B1D1B] max-w-5xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
          HOW IT WOULD WORK
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
          Fees in, inference out.
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
              title: "Fees fund the pool",
              body: "A portion of protocol treasury revenue converts to real OpenRouter credit at face value — $1 of fees becomes $1 of inference.",
            },
            {
              n: "02",
              title: "Split by your stake",
              body: "Credit is split pro-rata by time-weighted staked $INTERN, reusing the same balances already earning you BE.",
            },
            {
              n: "03",
              title: "$INTERN burns to match",
              body: "Every dollar converted to credit also buys and burns an equal dollar of $INTERN — a second burn trigger alongside the deploy fee.",
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
            NOT LIVE YET
          </p>
          <p className="text-[#EDEEF0] text-lg mb-6 max-w-xl mx-auto">
            This ships after core staking is live, audited, and generating
            real fee revenue. Follow the{" "}
            <Link href="/roadmap" className="text-[#00C805] hover:underline">
              roadmap
            </Link>{" "}
            for real status.
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
