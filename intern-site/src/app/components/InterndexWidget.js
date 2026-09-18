"use client";

// Compact, real-dex-style swap box -- same live logic as the full
// /interndex page (useInterndexSwap.js), just a tighter layout so it
// fits in a sidebar-sized space (homepage hero, top of /trade) without
// needing its own scroll. Genuinely any-chain-to-any-chain now: both
// sides get a chain select + a searchable token picker (TokenSearchSelect),
// not a fixed "TO is Robinhood Chain" side. Deliberately no "advanced"
// controls here (slippage, route detail) -- that's what the "Full swap →"
// link to /interndex is for.
import Link from "next/link";
import ConnectWalletButton from "./ConnectWalletButton";
import TokenSearchSelect from "./TokenSearchSelect";
import { useInterndexSwap, formatToken, ROBINHOOD_CHAIN_ID } from "../interndex/useInterndexSwap";

function ChainSelect({ chains, selected, onChange, disabled }) {
  return (
    <select
      value={selected}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-transparent font-mono text-[10px] text-[var(--color-muted)] outline-none cursor-pointer disabled:opacity-50 max-w-[110px]"
    >
      {chains.map((c) => (
        <option key={c.id} value={c.id} className="bg-[var(--color-surface)]">
          {c.name}
        </option>
      ))}
    </select>
  );
}

export default function InterndexWidget({ className = "" }) {
  const s = useInterndexSwap();

  return (
    <div
      className={`border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[11px] text-[var(--color-accent)] tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ember-pulse" />
          $INTERNDEX
        </p>
        <p className="font-mono text-[10px] text-[var(--color-muted-2)]">anything to anything</p>
      </div>

      {/* FROM */}
      <div className="border border-[var(--color-line)] rounded-xl p-3 mb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] text-[var(--color-muted-2)] tracking-wide">FROM</span>
          <ChainSelect chains={s.chains} selected={s.fromChainId} onChange={s.selectFromChain} disabled={s.busy} />
        </div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={s.amount}
            onChange={(e) => s.setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={s.busy}
            className="w-full bg-transparent font-mono text-xl outline-none disabled:opacity-50 min-w-0"
          />
          <TokenSearchSelect
            tokens={s.fromTokens}
            selected={s.fromToken}
            onSelect={s.selectFrom}
            disabled={s.busy}
            loading={s.fromTokensLoading}
          />
        </div>
        {s.isConnected && (
          <button
            type="button"
            onClick={() => s.setAmount(formatToken(s.balance, s.fromDecimals, 18).replace(/,/g, ""))}
            className="font-mono text-[10px] text-[var(--color-muted-2)] hover:text-[var(--color-accent)] transition-colors"
          >
            balance: {formatToken(s.balance, s.fromDecimals, 4)} {s.fromToken.symbol}
          </button>
        )}
      </div>

      <div className="flex justify-center -my-1 relative z-10">
        <button
          type="button"
          disabled={s.busy}
          onClick={s.flip}
          title="Flip"
          className="w-7 h-7 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 1v10M2.5 7.5L6 11l3.5-3.5M9.5 4.5L6 1 2.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* TO */}
      <div className="border border-[var(--color-line)] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] text-[var(--color-muted-2)] tracking-wide">TO</span>
          <ChainSelect chains={s.chains} selected={s.toChainId} onChange={s.selectToChain} disabled={s.busy} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xl text-[var(--color-muted)] truncate min-w-0">
            {s.quoting
              ? "…"
              : s.quote
                ? formatToken(s.quote.estimate.toAmount, s.toToken.decimals ?? 18, 6)
                : "0.0"}
          </span>
          <TokenSearchSelect
            tokens={s.toTokens}
            selected={s.toToken}
            onSelect={s.selectTo}
            disabled={s.busy}
            loading={s.toTokensLoading}
          />
        </div>
      </div>

      <div className="font-mono text-[10px] text-[var(--color-muted-2)] mb-3 min-h-[1.3em] leading-relaxed">
        {s.isNoopSwap
          ? "Pick two different tokens."
          : s.quoteError
            ? s.quoteError
            : s.isFromIntern
              ? s.toChainId !== ROBINHOOD_CHAIN_ID
                ? "Selling to a different destination chain skips the auto buyback-burn for now — no fee charged either."
                : s.toFeeAmount > 0n
                  ? `0.2% of the ${s.toToken.symbol} you get back (${formatToken(s.toFeeAmount, s.toToken.decimals ?? 18, 6)}) buys back & burns $INTERN after.`
                  : "0.2% of what you receive buys back & burns $INTERN after the swap."
              : s.parsedAmount > 0n
                ? `${formatToken(s.feeAmount, s.fromDecimals, 4)} ${s.fromToken.symbol} (0.2%) buys back & burns $INTERN.`
                : "Every swap's fee buys back & burns $INTERN."}
      </div>

      {!s.isConnected ? (
        <div className="flex justify-center">
          <ConnectWalletButton />
        </div>
      ) : (
        <button
          type="button"
          onClick={s.handleSwap}
          disabled={s.busy || s.isNoopSwap || !s.quote?.transactionRequest}
          className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {s.buttonLabel}
        </button>
      )}

      {s.flowError && (
        <p className="font-mono text-[10px] text-[var(--color-danger)] mt-2.5">{s.flowError}</p>
      )}
      {s.flowStep === "done" && s.lastTxHash && (
        <p className="font-mono text-[10px] text-[var(--color-accent)] mt-2.5 text-center">
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

      <Link
        href="/interndex"
        className="block text-center font-mono text-[10px] text-[var(--color-muted-2)] hover:text-[var(--color-accent)] transition-colors mt-3"
      >
        Full swap experience, meet Hush →
      </Link>
    </div>
  );
}
