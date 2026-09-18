"use client";

// $interndex -- a cross-chain swap front end into $INTERN and a
// curated set of other real Robinhood Chain tokens (see
// lib/chain.js's INTERNDEX_CHAINS), routed through a real, live
// third-party aggregator behind the scenes (see lib/lifi.js for which
// one and why) -- deliberately not named here in the UI; which backend
// does the routing is an implementation detail, not something a user
// needs to know.
//
// All the real wallet/quote/swap logic lives in useInterndexSwap.js now,
// shared with the compact widget on the homepage/trade page
// (components/InterndexWidget.js) -- this file is just the full,
// spacious presentation of it (pill pickers, persona intro, disclosures).
import Image from "next/image";
import ConnectWalletButton from "../components/ConnectWalletButton";
import PersonaIntroVideo from "../components/PersonaIntroVideo";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { INTERNDEX_CHAINS, INTERNDEX_TOKENS } from "../lib/chain";
import { useInterndexSwap, formatToken } from "./useInterndexSwap";

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

function PillPicker({ label, options, selected, onSelect, disabled, renderLabel }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.symbol || opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className={`font-mono text-xs rounded-lg px-3 py-1.5 border transition-colors disabled:opacity-40 ${
              selected === (opt.symbol || opt.id)
                ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {renderLabel ? renderLabel(opt) : opt.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InterndexView() {
  const s = useInterndexSwap();

  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full">
      <Reveal className="flex items-center gap-4 mb-6 flex-wrap">
        <Image
          src="/personas/hush-icon.png"
          alt="Hush icon"
          width={64}
          height={64}
          className="rounded-full border border-[var(--color-line)] w-14 h-14"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
            MEET HUSH · PRIVACY INTERN
          </p>
          <LiveBadge>LIVE</LiveBadge>
        </div>
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-xl">
        Swap in from anywhere. Burn $INTERN.
      </Reveal>
      <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-xl mb-10">
        Real, live rates — from Robinhood Chain itself, or straight
        from Ethereum, Arbitrum, or Base. Every swap&apos;s fee buys
        back and burns $INTERN automatically, whatever you&apos;re
        trading. The confidential-swap privacy tech Hush is named for
        is her direction, not a shipped feature yet — no date.
      </Reveal>

      <Reveal delay={0.12} className="mb-10">
        <PersonaIntroVideo
          src="/personas/videos/hush-intro.mp4"
          poster="/personas/hush.png"
          label="Hush idle animation"
        />
      </Reveal>

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6"
      >
        <motion.div variants={fadeUp} className="mb-5">
          <PillPicker
            label="FROM CHAIN"
            options={INTERNDEX_CHAINS}
            selected={s.fromChainId}
            onSelect={s.selectChain}
            disabled={s.busy}
            renderLabel={(c) => c.name}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4 mb-5">
          <PillPicker label="FROM TOKEN" options={s.fromChain.tokens} selected={s.fromSymbol} onSelect={s.selectFrom} disabled={s.busy} />
          <PillPicker label="TO (ROBINHOOD CHAIN)" options={INTERNDEX_TOKENS} selected={s.toSymbol} onSelect={s.selectTo} disabled={s.busy} />
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
            YOUR {s.fromSymbol} BALANCE ({s.fromChain.name})
          </span>
          <span className="font-mono text-sm text-[var(--color-fg)]">
            {s.isConnected ? formatToken(s.balance, s.fromDecimals, 2) : "—"}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="relative mb-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={s.amount}
            onChange={(e) => s.setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={s.busy}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl pl-4 pr-28 py-3 font-mono text-lg outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-[var(--color-muted)]">
            {s.fromSymbol} → {s.toSymbol}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="font-mono text-xs text-[var(--color-muted)] mb-2 min-h-[1.5em]">
          {!s.isCrossChain && s.fromSymbol === s.toSymbol
            ? "Pick two different tokens."
            : s.quoting
              ? "Getting a live quote…"
              : s.quoteError
                ? s.quoteError
                : s.quote
                  ? `≈ ${formatToken(s.quote.estimate.toAmount, s.toToken.decimals ?? 18)} ${s.toSymbol} — min ${formatToken(s.quote.estimate.toAmountMin, s.toToken.decimals ?? 18)} after slippage`
                  : s.parsedAmount > 0n
                    ? "Waiting for a quote…"
                    : "Enter an amount to see a real, live rate."}
        </motion.div>
        {s.parsedAmount > 0n && (s.isCrossChain || s.fromSymbol !== s.toSymbol) && (
          <motion.div variants={fadeUp} className="font-mono text-[10px] text-[var(--color-ember)] mb-5">
            {s.isFromIntern
              ? s.toFeeAmount > 0n
                ? `100% swaps to ${s.toSymbol} — then 1% of what you receive (${formatToken(s.toFeeAmount, s.toToken.decimals ?? 18, 6)} ${s.toSymbol}) buys back & burns $INTERN. Real buy pressure, not just a burn.`
                : "100% swaps to your wallet, then 1% of what you receive buys back & burns $INTERN — real buy pressure, not just a burn."
              : `${formatToken(s.feeAmount, s.fromDecimals, 4)} ${s.fromSymbol} (1%) buys back & burns $INTERN — ${formatToken(s.swapAmount, s.fromDecimals, 4)} ${s.fromSymbol} swapped to ${s.toSymbol}.`}
          </motion.div>
        )}

        {!s.isConnected ? (
          <motion.div variants={fadeUp} className="flex justify-center">
            <ConnectWalletButton />
          </motion.div>
        ) : (
          <motion.button
            variants={fadeUp}
            type="button"
            onClick={s.handleSwap}
            disabled={s.busy || (!s.isCrossChain && s.fromSymbol === s.toSymbol) || !s.quote?.transactionRequest}
            className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {s.buttonLabel}
          </motion.button>
        )}

        {s.flowError && (
          <p className="font-mono text-[10px] text-[var(--color-danger)] mt-3">{s.flowError}</p>
        )}
        {s.flowStep === "done" && s.lastTxHash && (
          <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
            Swapped.{" "}
            <a
              href={
                s.isCrossChain
                  ? undefined
                  : `https://robinhoodchain.blockscout.com/tx/${s.lastTxHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {s.isCrossChain ? `Tx: ${s.lastTxHash}` : "View on Blockscout ↗"}
            </a>
          </p>
        )}
      </motion.div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-6 leading-relaxed max-w-xl">
        Non-custodial — this swaps straight from your connected wallet.
        A cross-chain swap needs your wallet switched to the FROM
        chain to sign; you&apos;ll be prompted. Verify the contract
        address on Blockscout before connecting if you&apos;re unsure.
      </p>
    </section>
  );
}
