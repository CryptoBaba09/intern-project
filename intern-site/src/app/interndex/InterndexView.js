"use client";

// $interndex -- $INTERN's own swap-facilitation front end, routed
// through LI.FI rather than a swap contract this project would have to
// build and audit itself. Confirmed live on Robinhood Chain from day
// one (Robinhood's own wallet uses LI.FI here), and confirmed 2026-09-18
// via a real li.quest/v1/quote call that it already routes $INTERN
// itself through a real DEX ("fly") at a real price -- see lib/lifi.js.
//
// Two real, separate gates, not one:
//   1. Quotes are real and live *today* -- LI.FI's public API needs no
//      registration for these, so this page always shows a genuine
//      live rate, same discipline as every other live number on this
//      site.
//   2. Actually swapping (and this project earning its integrator fee
//      on it) needs a real partner registration at portal.li.fi with a
//      real fee-collection wallet -- a business step for the team, not
//      an engineering one. isInterndexLive() gates on that, not on
//      whether quoting works.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { CONTRACTS, isInterndexLive } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";
import { fetchInterndexQuote, NATIVE_ETH_SENTINEL } from "../lib/lifi";

function useTokenDecimals(address) {
  const { data } = useReadContract({
    address: address || undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(address) },
  });
  return data ?? 18;
}

function LiveBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

function PreviewBadge({ children }) {
  return (
    <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2.5 py-1 tracking-widest">
      {children}
    </span>
  );
}

function formatToken(value, decimals = 18, maxFractionDigits = 6) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export default function InterndexView() {
  const { address, isConnected } = useAccount();
  const live = isInterndexLive();

  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const internDecimals = useTokenDecimals(CONTRACTS.internToken);

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, internDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, internDecimals]);
  const { data: balance } = useReadContract({
    address: CONTRACTS.internToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  });

  // Same debounced-live-quote pattern RewardChoicePreview.js already
  // uses: a plain read against LI.FI's public API, re-quoted whenever
  // the amount changes. Needs a real address to quote against even
  // pre-connect -- LI.FI's own API requires one -- so this falls back
  // to the dead address purely for display purposes when no wallet is
  // connected yet (never used for an actual swap).
  const quoteRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuote(null);
    setQuoteError(null);
    if (!parsedAmount) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await fetchInterndexQuote({
          fromToken: CONTRACTS.internToken,
          toToken: NATIVE_ETH_SENTINEL,
          fromAmount: parsedAmount.toString(),
          fromAddress: address || "0x000000000000000000000000000000000000dEaD",
        });
        if (quoteRequestId.current === requestId) setQuote(data);
      } catch (err) {
        if (quoteRequestId.current === requestId) {
          setQuoteError(err.message || "Couldn't get a live quote for that amount.");
        }
      } finally {
        if (quoteRequestId.current === requestId) setQuoting(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [parsedAmount, address]);

  const { sendTransaction, data: txHash, isPending, error: sendError, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  function handleSwap() {
    if (!quote?.transactionRequest) return;
    reset();
    const tx = quote.transactionRequest;
    sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value ? BigInt(tx.value) : undefined,
    });
  }

  const busy = isPending || isConfirming;

  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full">
      <Reveal className="flex flex-wrap items-center gap-3 mb-4">
        <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
          $INTERNDEX · POWERED BY LI.FI
        </p>
        <LiveBadge>LIVE QUOTES</LiveBadge>
        {!live && <PreviewBadge>SWAP NOT LIVE</PreviewBadge>}
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-xl">
        Swap through $INTERN.
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-lg leading-relaxed max-w-xl mb-10"
      >
        Real routing via LI.FI — live on Robinhood Chain from day one,
        the same infra Robinhood&apos;s own wallet uses. Quotes below are
        real and live today. Executing a swap here, and this project
        earning a fee on it, is gated on a real partner registration —
        not live yet, see below.
      </Reveal>

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6"
      >
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
          <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
            YOUR $INTERN BALANCE
          </span>
          <span className="font-mono text-sm text-[var(--color-fg)]">
            {isConnected ? formatToken(balance, internDecimals, 2) : "—"}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="relative mb-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={busy}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl pl-4 pr-28 py-3 font-mono text-lg outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-[var(--color-muted)]">
            $INTERN → ETH
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="font-mono text-xs text-[var(--color-muted)] mb-5 min-h-[1.5em]">
          {quoting
            ? "Getting a live quote from LI.FI…"
            : quoteError
              ? quoteError
              : quote
                ? `≈ ${formatToken(quote.estimate.toAmount)} ETH via ${quote.toolDetails?.name || quote.tool} — min ${formatToken(quote.estimate.toAmountMin)} after slippage`
                : parsedAmount > 0n
                  ? "Waiting for a quote…"
                  : "Enter an amount to see a real, live rate."}
        </motion.div>

        {!isConnected ? (
          <motion.div variants={fadeUp} className="flex justify-center">
            <ConnectWalletButton />
          </motion.div>
        ) : (
          <motion.button
            variants={fadeUp}
            type="button"
            onClick={handleSwap}
            disabled={!live || busy || !quote?.transactionRequest}
            className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!live
              ? "SWAP NOT LIVE — FEE REGISTRATION PENDING"
              : busy
                ? isConfirming
                  ? "CONFIRMING…"
                  : "CONFIRM IN WALLET…"
                : "SWAP"}
          </motion.button>
        )}

        {sendError && (
          <p className="font-mono text-[10px] text-[var(--color-danger)] mt-3">
            {sendError.shortMessage || sendError.message}
          </p>
        )}
        {isConfirmed && (
          <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
            Swapped.{" "}
            <a
              href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View on Blockscout ↗
            </a>
          </p>
        )}
      </motion.div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-6 leading-relaxed max-w-xl">
        Quotes come straight from LI.FI&apos;s public API — real routing,
        real price, no registration needed to look. The SWAP button
        stays off until this project is a real, registered LI.FI
        partner with a real fee-collection wallet, so no fee is ever
        implied here before one actually exists.
      </p>
    </section>
  );
}
