"use client";

// $interndex -- a cross-chain swap front end into $INTERN and a
// curated set of other real Robinhood Chain tokens (see
// lib/chain.js's INTERNDEX_CHAINS), routed through a real, live
// third-party aggregator behind the scenes (see lib/lifi.js for which
// one and why) -- deliberately not named here in the UI; which backend
// does the routing is an implementation detail, not something a user
// needs to know.
//
// TO is always Robinhood Chain -- that's where $INTERN and the dead
// address live, and this product's real job is funneling liquidity
// FROM anywhere INTO it, not being a fully generic any-chain router.
// FROM can be Robinhood Chain itself, or Ethereum/Arbitrum/Base --
// confirmed live 2026-09-18 that a real Ethereum ETH -> Robinhood
// Chain $INTERN quote resolves via "Relay" (one of Robinhood Chain's
// own documented bridge partners) as a single signable transaction.
// Swapping FROM a non-Robinhood chain needs the wallet actually
// switched to that chain to sign anything sourced from it -- that's
// what useSwitchChain below is for.
//
// Earning our own fee is a separate thing entirely -- the aggregator's
// own fee-sharing hard-rejects an unregistered integrator (see
// chain.js's INTERNDEX_FEE_BPS comment), so this takes its own 1% cut
// BEFORE routing the rest through it:
//   - If you're swapping FROM $INTERN, the fee-cut is already $INTERN
//     -- straight transfer to the dead address, no swap needed.
//   - Otherwise, the fee-cut gets its own quote (fromToken -> $INTERN,
//     same fromChain, toChain always Robinhood Chain) with `toAddress`
//     set to the dead address -- LI.FI's own executed swap delivers
//     the bought-back $INTERN straight into it, cross-chain or not.
//     One transaction, simultaneously the buyback and the burn.
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useSendTransaction,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import PersonaIntroVideo from "../components/PersonaIntroVideo";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { motion } from "framer-motion";
import { CONTRACTS, DEAD_ADDRESS, INTERNDEX_FEE_BPS, INTERNDEX_CHAINS, INTERNDEX_TOKENS } from "../lib/chain";
import { ERC20_ABI } from "../lib/abis";
import { fetchInterndexQuote, NATIVE_ETH_SENTINEL } from "../lib/lifi";

const ROBINHOOD_CHAIN_ID = INTERNDEX_CHAINS[0].id;

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
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [fromChainId, setFromChainId] = useState(ROBINHOOD_CHAIN_ID);
  const fromChain = INTERNDEX_CHAINS.find((c) => c.id === fromChainId);
  const [fromSymbol, setFromSymbol] = useState("INTERN");
  const [toSymbol, setToSymbol] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  const [flowStep, setFlowStep] = useState("idle"); // idle | switching | approving | burning | swapping | done
  const [flowError, setFlowError] = useState(null);
  const [lastTxHash, setLastTxHash] = useState(null);

  const fromToken = fromChain.tokens.find((t) => t.symbol === fromSymbol) || fromChain.tokens[0];
  const toToken = INTERNDEX_TOKENS.find((t) => t.symbol === toSymbol);
  const isFromNative = isNativeToken(fromToken.address);
  const isFromIntern =
    fromChainId === ROBINHOOD_CHAIN_ID && fromToken.address.toLowerCase() === CONTRACTS.internToken.toLowerCase();
  const isCrossChain = fromChainId !== ROBINHOOD_CHAIN_ID;

  function selectChain(chain) {
    setFlowError(null);
    setFromChainId(chain.id);
    // Token lists differ per chain -- reset FROM to that chain's first
    // token rather than risk carrying over a symbol that doesn't exist
    // there.
    setFromSymbol(chain.tokens[0].symbol);
  }
  function selectFrom(token) {
    setFlowError(null);
    setFromSymbol(token.symbol);
    if (fromChainId === ROBINHOOD_CHAIN_ID && token.symbol === toSymbol) setToSymbol(fromSymbol);
  }
  function selectTo(token) {
    setFlowError(null);
    setToSymbol(token.symbol);
    if (fromChainId === ROBINHOOD_CHAIN_ID && token.symbol === fromSymbol) setFromSymbol(toSymbol);
  }

  const { data: fromDecimalsData } = useReadContract({
    address: isFromNative ? undefined : fromToken.address,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: fromChainId,
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
    chainId: fromChainId,
    query: { enabled: Boolean(address) && !isFromNative, refetchInterval: 8000 },
  });
  const { data: nativeBalance } = useBalance({
    address,
    chainId: fromChainId,
    query: { enabled: Boolean(address) && isFromNative, refetchInterval: 8000 },
  });
  const balance = isFromNative ? nativeBalance?.value : erc20Balance;

  // Debounced live quote for the MAIN swap (the post-fee remainder,
  // delivered to the user's own wallet) -- same pattern
  // RewardChoicePreview.js already uses. TO is always Robinhood Chain;
  // FROM chain/token follow whatever's picked above, cross-chain or
  // not. The fee-buyback quote (when needed) is fetched fresh at swap
  // time instead, since it's a mechanical backend step, not something
  // shown live in the UI.
  const quoteRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuote(null);
    setQuoteError(null);
    if (!swapAmount || (fromChainId === ROBINHOOD_CHAIN_ID && fromSymbol === toSymbol)) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const data = await fetchInterndexQuote({
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: swapAmount.toString(),
          fromAddress: address || DEAD_ADDRESS,
          fromChainId,
          toChainId: ROBINHOOD_CHAIN_ID,
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
  }, [swapAmount, fromToken.address, toToken.address, fromChainId, fromSymbol, toSymbol, address]);

  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  async function ensureOnFromChain() {
    if (walletChainId !== fromChainId) {
      setFlowStep("switching");
      await switchChainAsync({ chainId: fromChainId });
    }
  }

  async function ensureApproval(spender, requiredAmount) {
    const allowance = await publicClient.readContract({
      address: fromToken.address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, spender],
      chainId: fromChainId,
    });
    if (allowance < requiredAmount) {
      setFlowStep("approving");
      const hash = await writeContractAsync({
        address: fromToken.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, maxUint256],
        chainId: fromChainId,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    }
  }

  async function sendRawTx(transactionRequest) {
    const hash = await sendTransactionAsync({
      to: transactionRequest.to,
      data: transactionRequest.data,
      value: transactionRequest.value ? BigInt(transactionRequest.value) : undefined,
      chainId: fromChainId,
    });
    await publicClient.waitForTransactionReceipt({ hash, chainId: fromChainId });
    return hash;
  }

  async function handleSwap() {
    if (!quote?.transactionRequest || !address) return;
    setFlowError(null);
    setLastTxHash(null);
    try {
      await ensureOnFromChain();

      if (feeAmount > 0n) {
        if (isFromIntern) {
          setFlowStep("burning");
          const hash = await writeContractAsync({
            address: fromToken.address,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [DEAD_ADDRESS, feeAmount],
            chainId: fromChainId,
          });
          await publicClient.waitForTransactionReceipt({ hash, chainId: fromChainId });
        } else {
          const feeQuote = await fetchInterndexQuote({
            fromToken: fromToken.address,
            toToken: CONTRACTS.internToken,
            fromAmount: feeAmount.toString(),
            fromAddress: address,
            toAddress: DEAD_ADDRESS,
            fromChainId,
            toChainId: ROBINHOOD_CHAIN_ID,
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

  const busy = ["switching", "approving", "burning", "swapping"].includes(flowStep);
  const buttonLabel =
    flowStep === "switching"
      ? `SWITCH TO ${fromChain.name.toUpperCase()} IN WALLET…`
      : flowStep === "approving"
        ? "APPROVE IN WALLET…"
        : flowStep === "burning"
          ? "BURNING FEE…"
          : flowStep === "swapping"
            ? "CONFIRM SWAP IN WALLET…"
            : "SWAP";

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
            selected={fromChainId}
            onSelect={selectChain}
            disabled={busy}
            renderLabel={(c) => c.name}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4 mb-5">
          <PillPicker label="FROM TOKEN" options={fromChain.tokens} selected={fromSymbol} onSelect={selectFrom} disabled={busy} />
          <PillPicker label="TO (ROBINHOOD CHAIN)" options={INTERNDEX_TOKENS} selected={toSymbol} onSelect={selectTo} disabled={busy} />
        </motion.div>

        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
            YOUR {fromSymbol} BALANCE ({fromChain.name})
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
          {!isCrossChain && fromSymbol === toSymbol
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
        {parsedAmount > 0n && (isCrossChain || fromSymbol !== toSymbol) && (
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
            disabled={busy || (!isCrossChain && fromSymbol === toSymbol) || !quote?.transactionRequest}
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
              href={
                isCrossChain
                  ? undefined
                  : `https://robinhoodchain.blockscout.com/tx/${lastTxHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {isCrossChain ? `Tx: ${lastTxHash}` : "View on Blockscout ↗"}
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
