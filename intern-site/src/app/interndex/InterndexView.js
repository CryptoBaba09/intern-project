"use client";

// $interndex -- a general swap front end for $INTERN and a curated set
// of other real tokens (see lib/chain.js's INTERNDEX_TOKENS), routed
// through a real, live third-party aggregator behind the scenes (see
// lib/lifi.js for which one and why) -- deliberately not named here in
// the UI; which backend does the routing is an implementation detail,
// not something a user needs to know.
//
// Real end to end today: a quote returns a fully-formed, executable
// transaction (to/data/value/gasLimit) with zero registration required.
//
// Earning our own fee is a separate thing entirely -- the aggregator's
// own fee-sharing hard-rejects an unregistered integrator (see
// chain.js's INTERNDEX_FEE_BPS comment), so this takes its own 1% cut
// BEFORE routing the rest through it:
//   - If you're swapping FROM $INTERN, the fee-cut is already $INTERN
//     -- straight transfer to the dead address, no swap needed.
//   - Otherwise, the fee-cut gets its own quote (fromToken -> $INTERN)
//     with `toAddress` set to the dead address -- LI.FI's own executed
//     swap delivers the bought-back $INTERN straight into it. One
//     transaction, simultaneously the buyback and the burn. Confirmed
//     live 2026-09-18 (ETH -> INTERN quote, toAddress=dead, real
//     transactionRequest returned).
// Either way, the main swap only ever covers the post-fee remainder.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useSendTransaction,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { CONTRACTS, DEAD_ADDRESS, INTERNDEX_FEE_BPS, INTERNDEX_TOKENS } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";
import { fetchInterndexQuote, NATIVE_ETH_SENTINEL } from "../lib/lifi";

function isNativeToken(address) {
  return address.toLowerCase() === NATIVE_ETH_SENTINEL.toLowerCase();
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

function TokenPicker({ label, tokens, selected, onSelect, disabled }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((t) => (
          <button
            key={t.symbol}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(t.symbol)}
            className={`font-mono text-xs rounded-lg px-3 py-1.5 border transition-colors disabled:opacity-40 ${
              selected === t.symbol
                ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            {t.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InterndexView() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [fromSymbol, setFromSymbol] = useState("INTERN");
  const [toSymbol, setToSymbol] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const [flowStep, setFlowStep] = useState("idle"); // idle | approving | burning | swapping | done
  const [flowError, setFlowError] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);

  const fromToken = INTERNDEX_TOKENS.find((t) => t.symbol === fromSymbol);
  const toToken = INTERNDEX_TOKENS.find((t) => t.symbol === toSymbol);
  const isFromNative = isNativeToken(fromToken.address);
  const isFromIntern = fromToken.address.toLowerCase() === CONTRACTS.internToken.toLowerCase();

  function selectFrom(symbol) {
    setFlowError(null);
    setFromSymbol(symbol);
    if (symbol === toSymbol) setToSymbol(fromSymbol);
  }
  function selectTo(symbol) {
    setFlowError(null);
    setToSymbol(symbol);
    if (symbol === fromSymbol) setFromSymbol(toSymbol);
  }

  const { data: fromDecimalsData } = useReadContract({
    address: isFromNative ? undefined : fromToken.address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !isFromNative },
  });
  const fromDecimals = isFromNative ? 18 : fromDecimalsData ?? 18;

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, fromDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, fromDecimals]);

  const feeAmount = (parsedAmount * INTERNDEX_FEE_BPS) / 10_000n;
  const swapAmount = parsedAmount - feeAmount;

  const { data: erc20Balance } = useReadContract({
    address: isFromNative ? undefined : fromToken.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: Boolean(address) && !isFromNative, refetchInterval: 8000 },
  });
  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: Boolean(address) && isFromNative, refetchInterval: 8000 },
  });
  const balance = isFromNative ? nativeBalance?.value : erc20Balance;

  // Debounced live quote for the MAIN swap (the post-fee remainder,
  // delivered to the user's own wallet) -- same pattern
  // RewardChoicePreview.js already uses. The fee-buyback quote (when
  // needed) is fetched fresh at swap time instead, since it's a
  // mechanical backend step, not something shown live in the UI.
  const quoteRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuote(null);
    setQuoteError(null);
    if (!swapAmount || fromSymbol === toSymbol) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await fetchInterndexQuote({
          fromToken: fromToken.address,
          toToken: toToken.address,
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
  }, [swapAmount, fromToken.address, toToken.address, fromSymbol, toSymbol, address]);

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  async function ensureApproval(spender, requiredAmount) {
    const allowance = await publicClient.readContract({
      address: fromToken.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, spender],
    });
    if (allowance < requiredAmount) {
      setFlowStep("approving");
      const hash = await writeContractAsync({
        address: fromToken.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
  }

  async function sendRawTx(transactionRequest) {
    const hash = await sendTransactionAsync({
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: transactionRequest.value ? BigInt(transactionRequest.value) : undefined,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async function handleSwap() {
    if (!quote?.transactionRequest || !address) return;
    setFlowError(null);
    setLastTxHash(null);
    try {
      if (feeAmount > 0n) {
        if (isFromIntern) {
          setFlowStep("burning");
          const hash = await writeContractAsync({
            address: fromToken.address,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [DEAD_ADDRESS, feeAmount],
          });
          await publicClient.waitForTransactionReceipt({ hash });
        } else {
          const feeQuote = await fetchInterndexQuote({
            fromToken: fromToken.address,
            toToken: CONTRACTS.internToken,
            fromAmount: feeAmount.toString(),
            fromAddress: address,
            toAddress: DEAD_ADDRESS,
          });
          if (!isFromNative) {
            await ensureApproval(feeQuote.estimate.approvalAddress, feeAmount);
          }
          setFlowStep("burning");
          await sendRawTx(feeQuote.transactionRequest);
        }
      }

      if (!isFromNative) {
        await ensureApproval(quote.estimate.approvalAddress, swapAmount);
      }
      setFlowStep("swapping");
      const hash = await sendRawTx(quote.transactionRequest);
      setLastTxHash(hash);
      setFlowStep("done");
    } catch (err) {
      setFlowError(err.shortMessage || err.message || "Something went wrong.");
      setFlowStep("idle");
    }
  }

  const busy = flowStep === "approving" || flowStep === "burning" || flowStep === "swapping";
  const buttonLabel =
    flowStep === "approving"
      ? "APPROVE IN WALLET…"
      : flowStep === "burning"
        ? "BURNING FEE…"
        : flowStep === "swapping"
          ? "CONFIRM SWAP IN WALLET…"
          : "SWAP";

  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full">
      <Reveal className="flex flex-wrap items-center gap-3 mb-4">
        <p className="font-mono text-xs text-[var(--color-accent)] tracking-widest">$INTERNDEX</p>
        <LiveBadge>LIVE</LiveBadge>
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-6 max-w-xl">
        Swap anything. Burn $INTERN.
      </Reveal>
      <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-lg leading-relaxed max-w-xl mb-10">
        Real, live rates, swapped straight from your wallet. Every
        swap&apos;s fee buys back and burns $INTERN — automatically,
        whatever you&apos;re trading.
      </Reveal>

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6"
      >
        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4 mb-5">
          <TokenPicker label="FROM" tokens={INTERNDEX_TOKENS} selected={fromSymbol} onSelect={selectFrom} disabled={busy} />
          <TokenPicker label="TO" tokens={INTERNDEX_TOKENS} selected={toSymbol} onSelect={selectTo} disabled={busy} />
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
            YOUR {fromSymbol} BALANCE
          </span>
          <span className="font-mono text-sm text-[var(--color-fg)]">
            {isConnected ? formatToken(balance, fromDecimals, 2) : "—"}
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
            {fromSymbol} → {toSymbol}
          </span>
        </motion.div>

        <motion.div variants={fadeUp} className="font-mono text-xs text-[var(--color-muted)] mb-2 min-h-[1.5em]">
          {fromSymbol === toSymbol
            ? "Pick two different tokens."
            : quoting
              ? "Getting a live quote…"
              : quoteError
                ? quoteError
                : quote
                  ? `≈ ${formatToken(quote.estimate.toAmount, toToken.decimals ?? 18)} ${toSymbol} — min ${formatToken(quote.estimate.toAmountMin, toToken.decimals ?? 18)} after slippage`
                  : parsedAmount > 0n
                    ? "Waiting for a quote…"
                    : "Enter an amount to see a real, live rate."}
        </motion.div>
        {parsedAmount > 0n && fromSymbol !== toSymbol && (
          <motion.div variants={fadeUp} className="font-mono text-[10px] text-[var(--color-ember)] mb-5">
            {formatToken(feeAmount, fromDecimals, 4)} {fromSymbol} (1%) buys back &amp; burns $INTERN —{" "}
            {formatToken(swapAmount, fromDecimals, 4)} {fromSymbol} swapped to {toSymbol}.
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
            disabled={busy || fromSymbol === toSymbol || !quote?.transactionRequest}
            className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </motion.button>
        )}

        {flowError && (
          <p className="font-mono text-[10px] text-[var(--color-danger)] mt-3">{flowError}</p>
        )}
        {flowStep === "done" && lastTxHash && (
          <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
            Swapped.{" "}
            <a
              href={`https://robinhoodchain.blockscout.com/tx/${lastTxHash}`}
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
