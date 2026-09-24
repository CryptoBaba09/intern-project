"use client";

// $interndex -- a genuinely any-chain-to-any-chain, any-token-to-any-
// token swap front end (see lib/lifiCatalog.js), routed through a
// real, live third-party aggregator behind the scenes (see lib/lifi.js
// for which one and why) -- deliberately not named here in the UI;
// which backend does the routing is an implementation detail, not
// something a user needs to know.
//
// All the real wallet/quote/swap logic lives in useInterndexSwap.js,
// shared with the compact widget on the homepage/trade page
// (components/InterndexWidget.js) -- this file is just the full,
// spacious presentation of it (persona intro, disclosures).
import Image from "next/image";
import ConnectWalletButton from "../components/ConnectWalletButton";
import PersonaIntroVideo from "../components/PersonaIntroVideo";
import PersonaProductSplit from "../components/PersonaProductSplit";
import TokenSearchSelect from "../components/TokenSearchSelect";
import Confetti from "../components/Confetti";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { useInterndexSwap, formatToken, ROBINHOOD_CHAIN_ID } from "./useInterndexSwap";

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

function ChainPicker({ label, chains, selected, onSelect, disabled }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-wide mb-2">{label}</p>
      <select
        value={selected}
        disabled={disabled}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50 cursor-pointer"
      >
        {chains.map((c) => (
          <option key={c.id} value={c.id} className="bg-[var(--color-surface)]">
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function InterndexView() {
  const s = useInterndexSwap();

  return (
    <section className="px-6 pt-16 pb-24 max-w-5xl mx-auto w-full">
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
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-2xl">
        Swap anything to anything. Burn $INTERN.
      </Reveal>
      <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-2xl mb-10">
        Real rates across every live chain and token our routing
        supports — not just a handful we&apos;ve hardcoded. Behind every trade, a
        slice quietly buys back and burns $INTERN. Hush&apos;s real
        target is further out: swaps with no wallet-to-trade trail, no
        amounts sitting in the open — genuinely private. Still in the
        lab, no date yet, but that&apos;s where this is headed.
      </Reveal>

      <div className="mb-6">
        <PersonaProductSplit
          media={
            <Reveal delay={0.12}>
              <PersonaIntroVideo
                src="/personas/videos/hush-intro.mp4"
                poster="/personas/hush.png"
                label="Hush idle animation"
              />
            </Reveal>
          }
        >
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6"
          >
        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4 mb-5">
          <ChainPicker label="FROM CHAIN" chains={s.chains} selected={s.fromChainId} onSelect={s.selectFromChain} disabled={s.busy} />
          <ChainPicker label="TO CHAIN" chains={s.chains} selected={s.toChainId} onSelect={s.selectToChain} disabled={s.busy} />
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
            YOUR {s.fromToken.symbol} BALANCE ({s.fromChain.name})
          </span>
          <span className="font-mono text-sm text-[var(--color-fg)]">
            {s.isConnected ? formatToken(s.balance, s.fromDecimals, 2) : "—"}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-2 border border-[var(--color-line)] rounded-xl pl-4 pr-2 py-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={s.amount}
            onChange={(e) => s.setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={s.busy}
            className="w-full bg-transparent font-mono text-lg outline-none disabled:opacity-50 min-w-0"
          />
          <span className="font-mono text-xs text-[var(--color-muted-2)] shrink-0">FROM</span>
          <TokenSearchSelect
            tokens={s.fromTokens}
            selected={s.fromToken}
            onSelect={s.selectFrom}
            disabled={s.busy}
            loading={s.fromTokensLoading}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-center my-1">
          <button
            type="button"
            disabled={s.busy}
            onClick={s.flip}
            title="Flip"
            className="w-8 h-8 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/50 transition-colors disabled:opacity-30"
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M6 1v10M2.5 7.5L6 11l3.5-3.5M9.5 4.5L6 1 2.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-2 border border-[var(--color-line)] rounded-xl pl-4 pr-2 py-2">
          <span className="w-full font-mono text-lg text-[var(--color-muted)] truncate">
            {s.quoting
              ? "…"
              : s.quote
                ? formatToken(s.quote.estimate.toAmount, s.toToken.decimals ?? 18)
                : "0.0"}
          </span>
          <span className="font-mono text-xs text-[var(--color-muted-2)] shrink-0">TO</span>
          <TokenSearchSelect
            tokens={s.toTokens}
            selected={s.toToken}
            onSelect={s.selectTo}
            disabled={s.busy}
            loading={s.toTokensLoading}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="font-mono text-xs text-[var(--color-muted)] mb-2 min-h-[1.5em]">
          {s.isNoopSwap
            ? "Pick two different tokens."
            : s.quoting
              ? "Getting a live quote…"
              : s.quoteError
                ? s.quoteError
                : s.quote
                  ? `≈ ${formatToken(s.quote.estimate.toAmount, s.toToken.decimals ?? 18)} ${s.toToken.symbol} — min ${formatToken(s.quote.estimate.toAmountMin, s.toToken.decimals ?? 18)} after slippage`
                  : s.parsedAmount > 0n
                    ? "Waiting for a quote…"
                    : "Enter an amount to see a real, live rate."}
        </motion.div>
        {s.parsedAmount > 0n && !s.isNoopSwap && (
          <motion.div variants={fadeUp} className="font-mono text-[10px] text-[var(--color-ember)] mb-5">
            {s.isFromIntern
              ? s.toChainId !== ROBINHOOD_CHAIN_ID
                ? "Selling to a different destination chain skips the auto buyback-burn for now (the bridge's other side isn't guaranteed to have arrived yet) — no fee charged either."
                : s.toFeeAmount > 0n
                  ? `100% swaps to ${s.toToken.symbol} — then 0.2% of what you receive (${formatToken(s.toFeeAmount, s.toToken.decimals ?? 18, 6)} ${s.toToken.symbol}) buys back & burns $INTERN. Real buy pressure, not just a burn.`
                  : "100% swaps to your wallet, then 0.2% of what you receive buys back & burns $INTERN — real buy pressure, not just a burn."
              : `${formatToken(s.feeAmount, s.fromDecimals, 4)} ${s.fromToken.symbol} (0.2%) buys back & burns $INTERN — ${formatToken(s.swapAmount, s.fromDecimals, 4)} ${s.fromToken.symbol} swapped to ${s.toToken.symbol}.`}
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
            disabled={s.busy || s.isNoopSwap || !s.quote?.transactionRequest}
            className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {s.buttonLabel}
          </motion.button>
        )}

        {s.flowError && (
          <p className="font-mono text-[10px] text-[var(--color-danger)] mt-3">{s.flowError}</p>
        )}
        <Confetti fire={s.flowStep === "done" ? s.lastTxHash : null} />
        {s.flowStep === "done" && s.lastTxHash && (
          <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
            Swapped.{" "}
            {s.fromChainId === ROBINHOOD_CHAIN_ID ? (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${s.lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View on Blockscout ↗
              </a>
            ) : (
              `Tx: ${s.lastTxHash}`
            )}
          </p>
        )}
          </motion.div>
        </PersonaProductSplit>
      </div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] max-w-2xl">
        Non-custodial — this swaps straight from your connected wallet.
        A swap sourced from a chain other than the one your wallet is
        currently on needs it switched first; you&apos;ll be prompted.
        Verify any token address yourself before trusting it with real
        money.
      </p>
    </section>
  );
}
