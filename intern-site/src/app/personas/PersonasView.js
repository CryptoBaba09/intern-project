"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";

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
      PREVIEW · NOT LIVE
    </span>
  );
}

export default function PersonasView() {
  return (
    <>
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-3 mb-4">
          <p className="font-mono text-xs text-[#00C805] tracking-widest">
            DIGITAL $INTERN PERSONAS
          </p>
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
          Stake $INTERN, unlock a personal AI avatar you can use to create
          content — a promotion ladder from Intern to Full-Time Offer, with
          higher tiers unlocking more customization and usage.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[#4A4F54] text-sm max-w-2xl">
          This page is a preview of a planned feature — the mockups below
          are illustrative, not real generated avatars, and nothing here is
          live yet. See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/digital-intern-avatars-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C805] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what's actually built vs. planned.
        </Reveal>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
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
            NOT LIVE YET
          </p>
          <p className="text-[#EDEEF0] text-lg mb-6 max-w-xl mx-auto">
            This ships after core staking is live and audited. Follow the{" "}
            <Link href="/roadmap" className="text-[#00C805] hover:underline">
              roadmap
            </Link>{" "}
            for real status.
          </p>
          <Link
            href="/stake"
            className="inline-block rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium px-6 py-3 hover:bg-[#00b304] transition-colors"
          >
            GO TO STAKING →
          </Link>
        </Reveal>
      </section>
    </>
  );
}
