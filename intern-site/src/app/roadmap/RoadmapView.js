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
      status: "LIVE",
    },
    {
      n: "04",
      title: "Content-creation key",
      body: "Text-generation beta is live, gated by real stake. Video generation is also live now — burn-based, not stake-gated, any of the 4 personas or a fully custom prompt.",
      status: "LIVE",
    },
    {
      n: "05",
      title: "Choose your reward",
      body: "Convert claimed BE into real TSLA, NVDA, or SPCX, one click — live now. Phase 2: any asset with real onchain liquidity, not just a curated three.",
      status: "LIVE",
    },
    {
      n: "06",
      title: "Roster Call",
      body: "Pitch the next intern persona. Real submissions, real database — treasury pays chosen ideas in $INTERN by hand, no automatic payout yet.",
      status: "LIVE",
    },
    {
      n: "07",
      title: "Resource-sharing rewards",
      body: "A future phase rewarding holders for contributing resources they aren't using.",
      status: "EXPLORING",
    },
    {
      n: "08",
      title: "Inference credit key",
      body: "Burn $INTERN for an instant OpenRouter credit top-up — live now. Staking into a shared credit pool is still in design.",
      status: "TOP-UP LIVE",
    },
    {
      n: "09",
      title: "Custom-build currency",
      body: "10,000 $INTERN burned once to launch your own custom intern, plus a staking minimum to keep it live.",
      status: "IN DESIGN",
    },
  ];

  return (
    <section className="px-6 pt-16 pb-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        MANY HATS
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-2">
        One $INTERN. Multiple hats.
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-base leading-relaxed max-w-2xl mb-10"
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
            className="border border-[var(--color-line)] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs text-[var(--color-muted-2)]">{h.n}</p>
              <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5">
                {h.status}
              </span>
            </div>
            <h3 className="text-lg font-medium mb-2">{h.title}</h3>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">{h.body}</p>
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
      body: "Stake $INTERN to earn a time-weighted, pro-rata share of BE from every creator fee claim. Live now — has not had an independent security review yet.",
      status: "LIVE",
    },
    {
      title: "Digital $INTERN personas",
      body: "Rendo's text-generation beta is live, gated by real stake tiers. Real video generation is also live now (burn-based, all 4 personas, or a fully custom prompt) — see /video-credits.",
      status: "LIVE",
      href: "/personas",
    },
    {
      title: "Inference credits",
      body: "Burn $INTERN for an instant OpenRouter credit top-up — live today. Staked $INTERN earning a pro-rata share of a treasury-funded credit pool is still in design.",
      status: "TOP-UP LIVE",
      href: "/inference-credits",
    },
    {
      title: "Choose your reward",
      body: "Convert BE claimed from staking into real, tokenized TSLA, NVDA, or SPCX — one approval, one swap, straight to your wallet. Real Uniswap V3 route, real slippage protection.",
      status: "LIVE",
      href: "/stake",
    },
    {
      title: "Choose your reward, Phase 2",
      body: "Today the target-asset list is owner-curated (three stocks plus BE) — safe, but limited. Phase 2 opens it to any asset with real onchain liquidity as Pons/pools.trade list more tokenized stocks, and explores a standing preference (pick once, every future claim lands pre-converted) instead of converting by hand each time.",
      status: "EXPLORING",
    },
    {
      title: "Roster Call",
      body: "The community pitches new intern personas — real submissions, stored and read. Treasury reviews and pays chosen ideas in $INTERN by hand from the treasury wallet; no automatic selection or on-chain payout yet.",
      status: "LIVE",
      href: "/roster",
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
      body: "Cache, the Yield & Borrow Intern: post a real tokenized stock as collateral and borrow USDG, or supply USDG directly and earn yield from real borrowers.",
      status: "COMING SOON",
      href: "/cache",
    },
    {
      title: "$interndex",
      body: "Fronted by Hush, the privacy intern: genuinely any-chain-to-any-token swaps, non-custodially, at a live real-time rate. Every swap's 0.2% fee cut really does buy back and burn $INTERN — confirmed live, not just designed. The confidential-swap privacy tech Hush is named for is the next target, still in the lab, no date yet.",
      status: "LIVE",
      href: "/interndex",
    },
    {
      title: "Genesis Interns (NFTs)",
      body: "500 Blaze-based NFTs, minting only after $INTERN crosses $1,000,000 in real trading volume. Mint, stake for BE, burn to claim and shrink supply further.",
      status: "IN DESIGN",
      href: "/genesis",
    },
    {
      title: "Resource-sharing rewards",
      body: "A future phase where holding $INTERN also earns rewards from resources you're not using. More details as this phase takes shape.",
      status: "EXPLORING",
    },
  ];

  return (
    <section className="px-6 py-20 max-w-6xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        PROTOCOL
      </Reveal>
      <Reveal as="h2" delay={0.05} className="text-3xl font-semibold mb-2">
        More than a token to trade
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-base leading-relaxed max-w-2xl mb-10"
      >
        $INTERN is the settlement layer for a growing set of things you can
        do with it — starting with hiring an AI agent, and going from there.{" "}
        <Link href="/learn/buyback-and-burn" className="text-[var(--color-accent)] hover:underline">
          Here&apos;s the on-chain proof the burn mechanics actually work →
        </Link>
      </Reveal>
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid sm:grid-cols-2 gap-px bg-[var(--color-line)] border border-[var(--color-line)]"
      >
        {items.map((item) => {
          const content = (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium">{item.title}</h3>
                <span className="font-mono text-[10px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-full px-2 py-0.5 shrink-0 ml-3">
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{item.body}</p>
              {item.href && (
                <p className="font-mono text-xs text-[var(--color-accent)] mt-3">
                  {item.status.includes("LIVE") ? "Try it live →" : "See preview →"}
                </p>
              )}
            </>
          );

          return (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              className="bg-[var(--color-bg)] p-6"
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
