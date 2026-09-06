"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Mascot from "../components/Mascot";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";

function PreviewBadge() {
  return (
    <span className="font-mono text-[10px] text-[#D9A441] border border-[#D9A441]/30 rounded-full px-2.5 py-1 tracking-widest">
      PREVIEW · NOT LIVE
    </span>
  );
}

// Illustrative trait recolors of Blaze -- real trait art doesn't exist
// yet (see docs/genesis-nft-spec.md). Same base mascot, different accent
// palette, just to show the shape of "500 unique but recognizably
// related" rather than pretending these are final.
const TRAIT_PREVIEWS = [
  { name: "#001 · Ember", filter: "none" },
  { name: "#002 · Frostbyte", filter: "hue-rotate(150deg)" },
  { name: "#003 · Nightshift", filter: "hue-rotate(230deg) saturate(1.3)" },
  { name: "#004 · Goldrush", filter: "hue-rotate(-60deg) saturate(1.4)" },
];

export default function GenesisView() {
  return (
    <>
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto w-full">
        <Reveal className="flex items-center gap-3 mb-4">
          <p className="font-mono text-xs text-[#00C805] tracking-widest">
            MEET THE GENESIS INTERNS
          </p>
          <PreviewBadge />
        </Reveal>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
          500 collectibles. One good reason to burn more $INTERN.
        </Reveal>
        <Reveal
          as="p"
          delay={0.1}
          className="text-[#9BA1A6] text-lg leading-relaxed max-w-2xl mb-4"
        >
          Blaze, trait-varied, capped at 500 — but minting doesn't open on
          day one. It opens the moment $INTERN crosses{" "}
          <span className="text-[#EDEEF0]">$1,000,000</span> in real
          trading volume on PAIR. Earned, not day-one hype.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[#4A4F54] text-sm max-w-2xl">
          Nothing on this page is live — the collection doesn't exist yet,
          and the volume milestone hasn't been hit. See the full{" "}
          <a
            href="https://github.com/CryptoBaba09/intern-project/blob/main/docs/genesis-nft-spec.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00C805] hover:underline"
          >
            design spec ↗
          </a>{" "}
          for what's actually decided vs. still open.
        </Reveal>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 sm:grid-cols-4 gap-5"
        >
          {TRAIT_PREVIEWS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="border border-[#1B1D1B] rounded-2xl p-5 bg-[#0F1113]"
            >
              <div style={{ filter: t.filter }} className="aspect-square mb-3">
                <Mascot className="w-full h-full" />
              </div>
              <p className="font-mono text-[11px] text-[#9BA1A6] text-center">{t.name}</p>
            </motion.div>
          ))}
        </motion.div>
        <p className="font-mono text-[10px] text-[#4A4F54] mt-5 text-center max-w-md mx-auto leading-relaxed">
          Illustrative recolors, not final trait art — the real 500 don't
          exist yet.
        </p>
      </section>

      <section className="px-6 py-20 border-t border-[#1B1D1B] max-w-5xl mx-auto w-full">
        <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
          THE MECHANIC
        </Reveal>
        <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-10">
          Mint. Stake. Burn.
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
              title: "Mint",
              body: "Burn a fixed $INTERN amount to mint one Genesis Intern, while supply lasts — 500 total, ever.",
            },
            {
              n: "02",
              title: "Stake",
              body: "Stake it to stream a share of a BE reward pool — split pro-rata across whatever's currently staked.",
            },
            {
              n: "03",
              title: "Burn",
              body: "Destroy it to claim what it's earned so far. Supply drops by one, and everyone still staked owns a bigger share of what's left.",
            },
          ].map((step) => (
            <motion.div key={step.n} variants={fadeUp} className="border border-[#1B1D1B] p-6">
              <p className="font-mono text-xs text-[#4A4F54] mb-4">{step.n}</p>
              <h3 className="text-lg font-medium mb-2">{step.title}</h3>
              <p className="text-sm text-[#9BA1A6] leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
        <p className="font-mono text-[10px] text-[#4A4F54] mt-8 max-w-2xl leading-relaxed">
          This isn&apos;t built yet, and won&apos;t be marketed as
          guaranteed income when it is — a real legal review of that
          framing happens before anything here touches real money.
        </p>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto w-full text-center">
        <Reveal className="border border-[#1B1D1B] rounded-2xl p-10 bg-[#0F1113]">
          <p className="font-mono text-xs text-[#9BA1A6] tracking-widest mb-3">
            NOT LIVE YET
          </p>
          <p className="text-[#EDEEF0] text-lg mb-6 max-w-xl mx-auto">
            The countdown starts the moment $INTERN is trading. Follow the{" "}
            <Link href="/roadmap" className="text-[#00C805] hover:underline">
              roadmap
            </Link>{" "}
            for real status.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/tokenomics"
              className="inline-block rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium px-6 py-3 hover:bg-[#00b304] transition-colors"
            >
              SEE THE TOKENOMICS →
            </Link>
            <Link
              href="/marketplace"
              className="inline-block rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium px-6 py-3 hover:border-[#00C805]/50 transition-colors"
            >
              MEET THE INTERNS →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
