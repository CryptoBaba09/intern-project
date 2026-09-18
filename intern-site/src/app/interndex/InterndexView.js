"use client";

// $interndex -- $INTERN's own swap-facilitation front end. Routed
// through a real, live third-party aggregator behind the scenes (see
// lib/lifi.js for which one and why) -- deliberately not named here in
// the UI; which backend does the routing is an implementation detail,
// not something a user needs to know.
//
// Real end to end today: a quote returns a fully-formed, executable
// transaction (to/data/value/gasLimit) with zero registration required
// -- confirmed live 2026-09-18 against $INTERN itself.
//
// Earning our own fee on a swap is a separate thing entirely -- the
// aggregator's own fee-sharing hard-rejects an unregistered integrator
// (see chain.js's INTERNDEX_FEE_BPS comment), so this takes its own 1%
// cut BEFORE routing anything through it: a direct transfer to
// DEAD_ADDRESS for the fee, then a quote/swap for just the remainder.
// Two sequential wallet-signed transactions, not one -- burn first,
// then swap, so a failed swap never leaves a burn stranded without a
// swap to go with it (the reverse order risks the opposite: a real
// burn with no swap if the second tx fails, which is the safer
// direction to fail in than a swap with a silently skipped fee).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { CONTRACTS, DEAD_ADDRESS, INTERNDEX_FEE_BPS } from "../lib/chain";
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

function formatToken(value, decimals = 18, maxFractionDigits = 6) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export default function InterndexView() {
  const { address, isConnected } = useAccount();

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

  const feeAmount = (parsedAmount * INTERNDEX_FEE_BPS) / 10_000n;
  const swapAmount = parsedAmount - feeAmount;

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
    if (!swapAmount) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await fetchInterndexQuote({
          fromToken: CONTRACTS.internToken,
          toToken: NATIVE_ETH_SENTINEL,
          fromAmount: swapAmount.toString(),
          fromAddress: address || DEAD_ADDRESS,
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
  }, [swapAmount, address]);

  const {
    writeContract: burnFee,
    data: burnTxHash,
    isPending: burnPending,
    error: burnError,
    reset: resetBurn,
  } = useWriteContract();
  const { isLoading: burnConfirming, isSuccess: burnConfirmed } = useWaitForTransactionReceipt({
    hash: burnTxHash,
  });

  const {
    sendTransaction,
    data: swapTxHash,
    isPending: swapPending,
    error: swapError,
    reset: resetSwap,
  } = useSendTransaction();
  const { isLoading: swapConfirming, isSuccess: swapConfirmed } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  // Set the instant the burn is sent, cleared once the swap actually
  // fires -- covers the gap between "burn confirmed" and "swap tx
  // sent" so the button stays disabled through it instead of
  // flickering back to clickable for a moment.
  const [awaitingSwap, setAwaitingSwap] = useState(false);

  function fireSwap() {
    const tx = quote.transactionRequest;
    sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value ? BigInt(tx.value) : undefined,
    });
  }

  function handleSwap() {
    if (!quote?.transactionRequest) return;
    resetBurn();
    resetSwap();
    if (feeAmount > 0n) {
      setAwaitingSwap(true);
      burnFee({
        address: CONTRACTS.internToken,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [DEAD_ADDRESS, feeAmount],
      });
    } else {
      fireSwap();
    }
  }

  // Fires the swap the moment the burn confirms -- the two txs are
  // sequential by construction (the swap amount is only ever quoted
  // for the post-fee remainder), so there's nothing to reconcile here,
  // just a trigger.
  useEffect(() => {
    if (awaitingSwap && burnConfirmed && quote?.transactionRequest) {
      setAwaitingSwap(false);
      fireSwap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingSwap, burnConfirmed]);

  const busy = burnPending || burnConfirming || awaitingSwap || swapPending || swapConfirming;

  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full">
      <Reveal className="flex flex-wrap items-center gap-3 mb-4">
        <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">
          $INTERNDEX
        </p>
        <LiveBadge>LIVE</LiveBadge>
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-xl">
        Swap through $INTERN.
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-lg leading-relaxed max-w-xl mb-10"
      >
        Real, live rates for $INTERN, swapped straight from your
        wallet.
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

        <motion.div variants={fadeUp} className="font-mono text-xs text-[var(--color-muted)] mb-2 min-h-[1.5em]">
          {quoting
            ? "Getting a live quote…"
            : quoteError
              ? quoteError
              : quote
                ? `≈ ${formatToken(quote.estimate.toAmount)} ETH — min ${formatToken(quote.estimate.toAmountMin)} after slippage`
                : parsedAmount > 0n
                  ? "Waiting for a quote…"
                  : "Enter an amount to see a real, live rate."}
        </motion.div>
        {parsedAmount > 0n && (
          <motion.div variants={fadeUp} className="font-mono text-[10px] text-[var(--color-ember)] mb-5">
            {formatToken(feeAmount, internDecimals, 4)} $INTERN (1%) burns directly — {formatToken(swapAmount, internDecimals, 4)} $INTERN swapped.
          </motion.div>
        )}

        {!isConnected ? (
          <motion.div variants={fadeUp} className="flex justify-center">
            <ConnectWalletButton />
          </motion.div>
        ) : (
          <motion.button
            variants={fadeUp}
            type="button"
            onClick={handleSwap}
            disabled={busy || !quote?.transactionRequest}
            className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {burnPending
              ? "CONFIRM BURN IN WALLET…"
              : burnConfirming
                ? "BURNING FEE…"
                : swapPending
                  ? "CONFIRM SWAP IN WALLET…"
                  : swapConfirming
                    ? "CONFIRMING SWAP…"
                    : "SWAP"}
          </motion.button>
        )}

        {(burnError || swapError) && (
          <p className="font-mono text-[10px] text-[var(--color-danger)] mt-3">
            {(burnError || swapError).shortMessage || (burnError || swapError).message}
          </p>
        )}
        {swapConfirmed && (
          <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
            Swapped.{" "}
            <a
              href={`https://robinhoodchain.blockscout.com/tx/${swapTxHash}`}
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
        Non-custodial — this swaps straight from your connected wallet.
        Verify the contract address on Blockscout before connecting if
        you&apos;re unsure.
      </p>
    </section>
  );
}
