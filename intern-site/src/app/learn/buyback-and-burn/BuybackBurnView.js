"use client";

import Link from "next/link";
import { Reveal } from "../../components/motion";

const BLOCKSCOUT = "https://robinhoodchain.blockscout.com";

function Label({ children }) {
  return (
    <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
      {children}
    </Reveal>
  );
}

function Requirement({ n, title, body }) {
  return (
    <Reveal className="border border-[var(--color-line)] p-6">
      <p className="font-mono text-xs text-[var(--color-muted-2)] mb-4">{n}</p>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{body}</p>
    </Reveal>
  );
}

function RevenuePath({ tag, title, body }) {
  return (
    <Reveal className="border border-[var(--color-line)] p-6">
      <p className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest inline-block mb-4">
        {tag}
      </p>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] leading-relaxed">{body}</p>
    </Reveal>
  );
}

function ProofRow({ label, hash, hashShort, detail }) {
  return (
    <div className="p-5 border-b border-[var(--color-line)] last:border-b-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-[var(--color-fg)] leading-relaxed max-w-xl">{label}</p>
        <a
          href={`${BLOCKSCOUT}/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-[var(--color-accent)] hover:underline whitespace-nowrap shrink-0"
        >
          {hashShort} ↗
        </a>
      </div>
      {detail && (
        <p className="font-mono text-[11px] text-[var(--color-muted)] mt-2">{detail}</p>
      )}
    </div>
  );
}

export default function BuybackBurnView() {
  return (
    <>
      <section className="px-6 pt-16 pb-12 max-w-3xl mx-auto w-full">
        <Label>LEARN · BUYBACK &amp; BURN</Label>
        <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold leading-[1.1] mb-6">
          Buyback-and-burn crypto usually doesn&apos;t work. Here&apos;s the proof for the one
          that does.
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed">
          Type &quot;buyback and burn crypto&quot; into any search engine and you&apos;ll get two
          kinds of results: marketing pages promising a mechanism, and skeptics explaining why
          it&apos;s usually theater. Both are right. Most of these tokens deserve the skepticism.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[var(--color-muted)] text-lg leading-relaxed mt-4">
          Here&apos;s what a real one requires, and the transaction hashes for a token that
          clears the bar.
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <Label>THE PATTERN</Label>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-4">
          The pattern skeptics have learned to spot
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] leading-relaxed">
          Most &quot;deflationary&quot; tokens follow the same script: announce a burn mechanism
          at launch, execute one manual burn to prove it&apos;s real, post the transaction once,
          then go quiet. The supply chart has one step down and then a flat line. There&apos;s no
          revenue funding it and no automation running it — it was a marketing event wearing
          tokenomics language.
        </Reveal>
        <Reveal as="p" delay={0.15} className="text-[var(--color-muted)] leading-relaxed mt-4">
          The tell is always the same question: is anything actually generating the tokens that
          get burned, on an ongoing basis, without someone manually doing it for a screenshot?
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <Label>THE BAR</Label>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          What a real mechanism actually needs
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          Two things, and most projects have neither.
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-6">
          <Requirement
            n="01"
            title="An actual, ongoing revenue source"
            body="Not a treasury allocation, not a one-time mint — something that keeps generating value as long as the product gets used."
          />
          <Requirement
            n="02"
            title="Automated, checkable execution"
            body="A bot or contract that runs on a schedule, not a person who burns tokens when they remember to."
          />
        </div>
        <Reveal delay={0.1} className="mt-6">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            If a project can&apos;t point to both, &quot;buyback and burn&quot; is just a slide in
            a deck.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <Label>THE MECHANISM</Label>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          How $INTERN clears it — two live revenue paths
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          Two independent revenue sources, both automated, both burning supply without a human in
          the loop.
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-6">
          <RevenuePath
            tag="BLAZE"
            title="Creator-fee buyback"
            body="$INTERN earns real creator fees from trading activity on Pons. A cron-scheduled bot claims those fees and splits them 70/20/10: 70% buys $INTERN on the open market and burns it, 20% streams to stakers, 10% goes to treasury. No one has to remember to run it — it runs on a schedule, from a wallet anyone can watch."
          />
          <RevenuePath
            tag="HUSH · $INTERNDEX"
            title="Swap-fee buyback"
            body="Every swap routed through $interndex — any chain, any token, in or out — takes a 0.2% fee. That fee buys $INTERN at the live rate and burns it, in the same flow as the swap. Not gated to a handful of pairs — it applies across every chain and token $interndex supports."
          />
        </div>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <Label>THE PROOF</Label>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-2">
          Don&apos;t take our word for it — here&apos;s the chain
        </Reveal>
        <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-sm leading-relaxed mb-8 max-w-2xl">
          This is the part most projects skip, because most projects don&apos;t want you looking
          closely. We do.
        </Reveal>

        <Reveal delay={0.15}>
          <p className="font-mono text-xs text-[var(--color-muted-2)] tracking-widest mb-3">
            CREATOR-FEE CYCLE, VERIFIED END TO END
          </p>
          <div className="border border-[var(--color-line)] mb-8">
            <ProofRow
              label="Fee claim on the escrow contract, from the project's fee-recipient wallet"
              hash="0xfa86c5f85fe7c21a165eec46cf7d01784996b56bd8241bd19573afa0a227b343"
              hashShort="0xfa86c5f8...a227b343"
              detail="claim() on PonsV2FeeEscrow — success"
            />
            <ProofRow
              label="That wallet buys $INTERN with the claimed ETH"
              hash="0x57dfe808f3e69b9e6e5696cd9d5ab2192002d7e92145e6a70ac1cccd856fe71c"
              hashShort="0x57dfe808...856fe71c"
              detail="0.0015 ETH → 830,002.547585679565550585 INTERN"
            />
            <ProofRow
              label="49 minutes later, that exact amount — to the fifteenth decimal — moves to the dead address"
              hash="0x683a0b90d850dfb396680cd291b14402cd2f66e6984518d0400d11bed33f24ef"
              hashShort="0x683a0b90...bed33f24ef"
              detail="830,002.547585679565550585 INTERN → 0x00...dEaD"
            />
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="font-mono text-xs text-[var(--color-muted-2)] tracking-widest mb-3">
            $INTERNDEX FEE CYCLE, FROM A REAL USER SWAP
          </p>
          <div className="border border-[var(--color-line)]">
            <ProofRow
              label="A live swap of $4.99 USDG into $INTERN, executed through $interndex"
              hash="0x08a3e9399602ab118a0f8bf376b86be43d61ab11e703eb9f702c7d624b1d56fc"
              hashShort="0x08a3e939...c7d624b1d56fc"
              detail="4.99 USDG → 1,049,993.71915777 INTERN"
            />
            <ProofRow
              label="The 0.2% fee cut is quoted separately and delivered as bought-back $INTERN straight to the dead address, in the companion transaction"
              hash="0xe78727261958c11676880cf8471f7b0e4e35c2563f42e943e8a6407d8cdb7929"
              hashShort="0xe7872726...cdb7929"
              detail="0.01 USDG → 2,108.424597055330113232 INTERN, burned"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Paste any of those into{" "}
            <a
              href={BLOCKSCOUT}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Blockscout
            </a>{" "}
            yourself. That&apos;s the point of publishing them.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <Label>WHAT&apos;S NOT LIVE YET</Label>
        <Reveal as="h2" delay={0.05} className="text-2xl font-semibold mb-6">
          Honestly, not everything is finished
        </Reveal>
        <Reveal className="space-y-4">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            This isn&apos;t a project that claims everything is done. Perky (tiered staking
            bonus) is unit-tested but not deployed — it needs its own audit first. Div (dividend
            routing) is blocked on Bloom Energy actually paying a real-world dividend, not on
            anything we control. Hush&apos;s namesake feature — confidential swaps, no
            wallet-to-trade trail — is the direction, not a shipped feature, and we&apos;re not
            claiming otherwise.
          </p>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            If a claim on this page stops being true, this page changes with it. That&apos;s the
            same rule as everything else we publish.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-24 max-w-3xl mx-auto w-full">
        <Reveal className="border border-[var(--color-line)] rounded-2xl p-8 text-center">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-4">
            SEE IT YOURSELF
          </p>
          <p className="text-[var(--color-muted)] text-sm leading-relaxed mb-6 max-w-xl mx-auto">
            Every number on this page is checkable right now — that&apos;s the actual pitch, not
            a slogan.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/interndex"
              className="inline-block rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium px-6 py-3 hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              TRY THE SWAP →
            </Link>
            <Link
              href="/tokenomics"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              FULL TOKENOMICS →
            </Link>
            <Link
              href="/stake"
              className="inline-block rounded-xl border border-[var(--color-line)] text-[var(--color-fg)] font-mono text-sm font-medium px-6 py-3 hover:border-[var(--color-accent)]/50 transition-colors"
            >
              STAKE $INTERN →
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
