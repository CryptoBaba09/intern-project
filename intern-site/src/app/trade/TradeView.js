"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { CONTRACTS, PAIR_POOL_URL, isTradingLive } from "../lib/chain";
import { ERC20_ABI, AGGREGATOR_ABI, V4_QUOTER_ABI } from "../lib/abis";
import { POOLS, INTERN_ADDRESS, poolIndexCandidates } from "../lib/pools";

// 5% -- generous on purpose. This pool is hours old with thin liquidity
// (see the live warning below); a tight slippage tolerance here just means
// every real trade fails and gets resubmitted anyway. The quote shown is
// always the live one -- slippage only bounds how much the *executed*
// price can move between quoting and confirmation.
const SLIPPAGE_BPS = 500n;
const DEADLINE_SECONDS = 600;

function useTokenDecimals(address) {
  const { data } = useReadContract({
    address: address || undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(address) },
  });
  return data ?? 18;
}

function ComingSoon() {
  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full text-center">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        TRADE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-4">
        Trading opens at launch
      </Reveal>
      <Reveal as="p" delay={0.1} className="text-[var(--color-muted)] text-base leading-relaxed">
        Comes online the moment $INTERN is live on PAIR.
      </Reveal>
    </section>
  );
}

function ConnectPrompt() {
  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full text-center">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        TRADE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-8">
        Connect a wallet to trade
      </Reveal>
      <Reveal delay={0.1} className="flex justify-center">
        <ConnectWalletButton />
      </Reveal>
    </section>
  );
}

function TradeDashboard() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const internDecimals = useTokenDecimals(INTERN_ADDRESS);

  const [side, setSide] = useState("buy"); // "buy" | "sell"
  const [quoteKey, setQuoteKey] = useState("USDG"); // "USDG" | "BE"
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pool = POOLS[quoteKey];
  const inputDecimals = side === "buy" ? pool.quoteDecimals : internDecimals;
  const outputDecimals = side === "buy" ? internDecimals : pool.quoteDecimals;
  const inputSymbol = side === "buy" ? pool.quoteSymbol : "INTERN";
  const outputSymbol = side === "buy" ? "INTERN" : pool.quoteSymbol;
  const inputToken = side === "buy" ? pool.quoteAddress : INTERN_ADDRESS;

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, inputDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, inputDecimals]);

  const zeroForOne = side === "buy" ? pool.buyZeroForOne : pool.sellZeroForOne;

  const { data: quoteData, isFetching: quoting } = useReadContract({
    address: CONTRACTS.v4Quoter,
    abi: V4_QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [{ poolKey: pool.poolKey, zeroForOne, exactAmount: parsedAmount, hookData: "0x" }],
    query: { enabled: parsedAmount > 0n, refetchInterval: 8000 },
  });
  const quotedOut = quoteData?.[0];
  const minOut = quotedOut !== undefined ? (quotedOut * (10000n - SLIPPAGE_BPS)) / 10000n : undefined;

  const { data: balances, refetch: refetchBalances } = useReadContracts({
    contracts: [
      { address: inputToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      {
        address: inputToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.aggregator],
      },
    ],
    query: { enabled: Boolean(address), refetchInterval: 6000 },
  });
  const [walletBalance, allowance] = balances?.map((d) => d.result) ?? [];

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isConfirmed) refetchBalances();
  }, [isConfirmed, refetchBalances]);

  useEffect(() => {
    setAmount("");
    setError("");
  }, [side, quoteKey]);

  const needsApproval =
    allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
  const busy = submitting || isPending || isConfirming;

  async function handleApprove() {
    setError("");
    try {
      await writeContractAsync({
        address: inputToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.aggregator, maxUint256],
      });
    } catch (err) {
      setError(err?.shortMessage || err?.message || "Approval failed.");
    }
  }

  // Trades against PAIR's real PairV5MultiPoolAggregator -- the exact
  // contract PAIR's own site calls for a balanced buy/sell. Per PAIR's
  // docs: "recompute quotes near signing time... simulate the complete
  // transaction before submission." So this never signs blind -- it
  // simulates buyExactInput/sellExactInput first (a free eth_call) against
  // each candidate pool index, and only asks the wallet to sign the exact
  // request that already succeeded in simulation.
  async function handleSubmit() {
    setError("");
    if (parsedAmount === 0n) return;
    setSubmitting(true);
    try {
      const freshQuote = await publicClient.readContract({
        address: CONTRACTS.v4Quoter,
        abi: V4_QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [{ poolKey: pool.poolKey, zeroForOne, exactAmount: parsedAmount, hookData: "0x" }],
      });
      const freshOut = freshQuote[0];
      const freshMinOut = (freshOut * (10000n - SLIPPAGE_BPS)) / 10000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);

      const functionName = side === "buy" ? "buyExactInput" : "sellExactInput";
      const thirdAddressArg = side === "buy" ? pool.quoteAddress : pool.quoteAddress;

      let simulated = null;
      let lastError = null;
      for (const poolIndex of poolIndexCandidates(pool)) {
        const leg = {
          poolIndex,
          poolKey: pool.poolKey,
          amountIn: parsedAmount,
          minAmountOut: freshMinOut,
        };
        try {
          const result = await publicClient.simulateContract({
            address: CONTRACTS.aggregator,
            abi: AGGREGATOR_ABI,
            functionName,
            args: [INTERN_ADDRESS, thirdAddressArg, address, [leg], freshMinOut, deadline],
            account: address,
          });
          simulated = result;
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!simulated) {
        throw new Error(
          lastError?.shortMessage ||
            "Couldn't validate a trade route against PAIR's aggregator right now — try again in a moment."
        );
      }

      await writeContractAsync(simulated.request);
      setAmount("");
    } catch (err) {
      setError(err?.shortMessage || err?.message || "Trade failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="px-6 pt-16 pb-24 max-w-2xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        TRADE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-2">
        Buy or sell $INTERN
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-base leading-relaxed max-w-xl mb-10"
      >
        Executes directly against PAIR's locked Uniswap V4 pools on
        Robinhood Chain, through PAIR's own public aggregator contract —
        same liquidity, same router, same price you'd get on pair.fund.
      </Reveal>

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="border border-[var(--color-line)] p-6"
      >
        <motion.div variants={fadeUp} className="flex gap-2 mb-5">
          {["buy", "sell"].map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`flex-1 rounded-xl font-mono text-sm font-medium py-2.5 transition-colors ${
                side === s
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "border border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50"
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="mb-4">
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-2">
            {side === "buy" ? "PAY WITH" : "RECEIVE"}
          </p>
          <div className="flex gap-2">
            {["USDG", "BE"].map((k) => (
              <button
                key={k}
                onClick={() => setQuoteKey(k)}
                className={`flex-1 rounded-xl font-mono text-sm py-2 transition-colors ${
                  quoteKey === k
                    ? "border border-[var(--color-accent)] text-[var(--color-fg)]"
                    : "border border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/50"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide mb-2">
            {inputSymbol} IN
          </p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl px-4 py-3 font-mono text-lg outline-none focus:border-[var(--color-accent)]/50 mb-1"
          />
          <p className="font-mono text-[10px] text-[var(--color-muted-2)] mb-4">
            Balance: {walletBalance !== undefined ? formatUnits(walletBalance, inputDecimals) : "—"}{" "}
            {inputSymbol}
          </p>

          <div className="border border-[var(--color-line)] rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
            <span className="font-mono text-xs text-[var(--color-muted)]">
              {outputSymbol} OUT {quoting && "(quoting…)"}
            </span>
            <span className="font-mono text-sm text-[var(--color-fg)]">
              {quotedOut !== undefined && parsedAmount > 0n
                ? Number(formatUnits(quotedOut, outputDecimals)).toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })
                : "—"}
            </span>
          </div>

          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={busy || parsedAmount === 0n}
              className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
            >
              {busy ? "CONFIRMING…" : `APPROVE ${inputSymbol}`}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={busy || parsedAmount === 0n}
              className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
            >
              {busy ? "CONFIRMING…" : side.toUpperCase()}
            </button>
          )}

          {error && (
            <p className="font-mono text-xs text-[var(--color-danger)] mt-3 leading-relaxed">{error}</p>
          )}
        </motion.div>
      </motion.div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-8 leading-relaxed max-w-xl">
        This pool is brand new with thin liquidity — a 5% slippage
        tolerance is applied automatically, and larger trades will move the
        price a lot. Start small. This widget calls PAIR's public,
        non-custodial aggregator contract directly from your wallet; it has
        NOT had a professional security audit. You can always trade the
        exact same locked liquidity on{" "}
        {PAIR_POOL_URL ? (
          <a href={PAIR_POOL_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
            pair.fund
          </a>
        ) : (
          "PAIR"
        )}{" "}
        instead if you'd rather.
      </p>
    </section>
  );
}

export default function TradeView() {
  const { isConnected } = useAccount();

  if (!isTradingLive()) return <ComingSoon />;
  if (!isConnected) return <ConnectPrompt />;
  return <TradeDashboard />;
}
