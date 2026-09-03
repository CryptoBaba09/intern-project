"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";

function ManyHats() {
  const hats = [
    {
      n: "01",
      title: "Autonomous burn engine",
      body: "Blaze claims creator fees and burns 70% of them automatically — no deploy step required.",
      status: "LIVE",
    },
    {
      n: "02",
      title: "Deflationary asset",
      body: "Fixed supply at launch, no mint function, ever — only ever decreases.",
      status: "LIVE",
    },
    {
      n: "03",
      title: "Staking asset",
      body: "Stake it to earn a time-weighted, streamed share of BE from every creator fee claim.",
      status: "COMING SOON",
    },
    {
      n: "04",
      title: "Content-creation key",
      body: "Stake tiers unlock a digital $INTERN avatar for content creation.",
      status: "IN DESIGN",
    },
    {
      n: "05",
      title: "Resource-sharing rewards",
      body: "A future phase rewarding holders for contributing resources they aren't using.",
      status: "EXPLORING",
    },
    {
      n: "06",
      title: "Inference credit key",
      body: "Staked $INTERN earns a share of real LLM inference credit — spend it on Claude, GPT, Gemini, and more.",
      status: "IN DESIGN",
    },
    {
      n: "07",
      title: "Custom-build currency",
      body: "10,000 $INTERN burned once to launch your own custom intern, plus a staking minimum to keep it live.",
      status: "IN DESIGN",
    },
  ];

  return (
    <section className="px-6 pt-16 pb-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        MANY HATS
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-2">
        One $INTERN. Multiple hats.
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[#9BA1A6] text-base leading-relaxed max-w-2xl mb-10"
      >
        The future of work runs on agents, not headcount. In crypto, an
        intern is never just one thing either — $INTERN is built to stay
        useful across every hat below, not just one to trade.
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {hats.map((h) => (
          <motion.div
            key={h.n}
            variants={fadeUp}
            whileHover={{ y: -4, borderColor: "rgba(0,200,5,0.35)" }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="border border-[#1B1D1B] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-[#4A4F54]">{h.n}</p>
              <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5">
                {h.status}
              </span>
            </div>
            <h3 className="text-lg font-medium mb-2">{h.title}</h3>
            <p className="text-sm text-[#9BA1A6] leading-relaxed">{h.body}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function Protocol() {
  const items = [
    {
      title: "AI agents marketplace",
      body: "Launching with Blaze, the protocol's autonomous burn engine — no deploy fee, no user action required. The 10,000 $INTERN deploy-and-burn fee applies to custom intern builds, coming to the marketplace.",
      status: "LIVE AT LAUNCH",
    },
    {
      title: "Stake-to-earn distributions",
      body: "Stake $INTERN to earn a time-weighted, pro-rata share of BE from every creator fee claim. Built and tested — going live once it's passed an independent security review.",
      status: "COMING SOON",
    },
    {
      title: "Digital $INTERN personas",
      body: "Stake tiers unlock a personal AI avatar for content creation — a promotion ladder from Intern to Full-Time Offer.",
      status: "IN DESIGN",
      href: "/personas",
    },
    {
      title: "Inference credits",
      body: "Staked $INTERN earns a pro-rata share of real LLM inference credit — spend it on Claude, GPT, Gemini, and more. Every dollar issued burns an equal dollar of $INTERN.",
      status: "IN DESIGN",
      href: "/inference-credits",
    },
    {
      title: "Custom intern builds",
      body: "Launch your own $INTERN-powered agent — payments, writing, automations, or anything else you spec — for a one-time deploy fee plus a staking minimum to keep it running.",
      status: "IN DESIGN",
      href: "/marketplace",
    },
    {
      title: "Tiered loyalty rewards",
      body: "A recurring treasury-funded bonus on top of the core staking distribution — bigger stakers earn a larger weighted share, funded separately from the 70/20/10 split.",
      status: "IN DESIGN",
    },
    {
      title: "Staked premium interns",
      body: "Stake more $INTERN to unlock more powerful, specialized intern templates.",
      status: "PLANNED",
    },
    {
      title: "Lending & borrowing",
      body: "Post $INTERN as collateral, or borrow against it.",
      status: "PLANNED",
    },
    {
      title: "Resource-sharing rewards",
      body: "A future phase where holding $INTERN also earns rewards from resources you're not using. More details as this phase takes shape.",
      status: "EXPLORING",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        PROTOCOL
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-2">
        More than a token to trade
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[#9BA1A6] text-base leading-relaxed max-w-2xl mb-10"
      >
        $INTERN is the settlement layer for a growing set of things you can
        do with it — starting with hiring an AI agent, and going from there.
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-2 gap-px bg-[#1B1D1B] border border-[#1B1D1B]"
      >
        {items.map((item) => {
          const content = (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">{item.title}</h3>
                <span className="font-mono text-[10px] text-[#9BA1A6] border border-[#1B1D1B] rounded-full px-2 py-0.5 shrink-0 ml-3">
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-[#9BA1A6] leading-relaxed">{item.body}</p>
              {item.href && (
                <p className="font-mono text-xs text-[#00C805] mt-3">See preview →</p>
              )}
            </>
          );

          return (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              className="bg-[#0B0C0B] p-6"
            >
              {item.href ? (
                <Link href={item.href} className="block">
                  {content}
                </Link>
              ) : (
                content
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

export default function RoadmapView() {
  return (
    <>
      <ManyHats />
      <Protocol />
    </>
  );
}
