"use client";

// Phase 1 of letting a staker choose what their claimed BE becomes --
// see docs/rewards-router-spec.md and
// contracts/contracts/InternRewardsRouter.sol. Two modes, chosen by
// isRewardsRouterLive() (true only once NEXT_PUBLIC_REWARDS_ROUTER_ADDRESS
// is actually set -- see lib/chain.js's own comment on why there's no
// hardcoded fallback there, unlike every other contract address):
//
//   NOT live (today): the honest static preview below -- what the
//   choices would be, clearly marked NOT LIVE. The router contract
//   exists and is unit-tested (47/47 passing, verified 2026-09-16) but
//   isn't deployed, same "unit-tested but not audited" gate as
//   everything else this site discloses before real value moves
//   through new code.
//
//   Live (once deployed + wired): a real quote-then-convert flow.
//   Converts BE already sitting in the wallet (from a previous
//   getReward()/exit() claim, same as always) -- this component never
//   touches staked $INTERN or calls getReward() on anyone's behalf.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { encodePacked, formatUnits, parseUnits, maxUint256 } from "viem";
import {
  CONTRACTS,
  REWARD_TARGET_ASSETS,
  QUOTER_V2_ADDRESS,
  BE_USDG_FEE,
  isRewardsRouterLive,
} from "../lib/chain";
import { ERC20_ABI, REWARDS_ROUTER_ABI, QUOTER_V2_ABI } from "../lib/abis";

// 1% default slippage tolerance on the live quote -- simple, fixed,
// matches the spirit of the bot's own maxSlippagePercent config rather
// than exposing a raw knob most people staking here won't want to
// tune themselves.
const SLIPPAGE_PERCENT = 1;

function formatToken(value, decimals = 18, maxFractionDigits = 4) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function encodePath(targetFee, targetAsset) {
  return encodePacked(
    ["address", "uint24", "address", "uint24", "address"],
    [CONTRACTS.beToken, BE_USDG_FEE, CONTRACTS.usdgToken, targetFee, targetAsset]
  );
}

function StaticPreview() {
  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {REWARD_TARGET_ASSETS.map((a) => (
          <div
            key={a.symbol}
            className={`rounded-xl border p-3 text-center ${
              a.isDefault
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                : "border-[var(--color-line)] opacity-80"
            }`}
          >
            <p className="font-mono text-sm text-[var(--color-accent)]">{a.symbol}</p>
            <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-1 leading-tight">
              {a.name}
            </p>
          </div>
        ))}
      </div>
      <p className="font-mono text-xs text-[var(--color-fg)] text-center">
        Claim your earned BE as BE — or convert it into a real, live
        Robinhood Stock Token instead. Same claim, your choice of shape.
      </p>
      <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-3 leading-relaxed text-center">
        Real, tradeable liquidity already exists for every asset above —
        checked directly on-chain, not a wishlist. The conversion
        contract exists and is unit-tested, waiting on a security review
        before any real BE flows through it.
      </p>
    </>
  );
}

function LiveConverter() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [targetSymbol, setTargetSymbol] = useState(
    REWARD_TARGET_ASSETS.find((a) => !a.isDefault)?.symbol
  );
  const [amount, setAmount] = useState("");
  const [quotedOut, setQuotedOut] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // "approve" | "convert"

  const target = REWARD_TARGET_ASSETS.find((a) => a.symbol === targetSymbol);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.beToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      {
        address: CONTRACTS.beToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.rewardsRouter],
      },
      {
        address: CONTRACTS.rewardsRouter,
        abi: REWARDS_ROUTER_ABI,
        functionName: "targetFee",
        args: [target?.address],
      },
    ],
    query: { enabled: Boolean(address && target), refetchInterval: 8000 },
  });
  const [beBalance, allowance, targetFee] = data?.map((d) => d.result) ?? [];

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, 18) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);

  // Guards against a stale quote landing after a newer one was already
  // requested -- e.g. the user switches TSLA -> NVDA while TSLA's
  // network round-trip is still in flight. Only the request that was
  // still "current" when it resolves gets to write state.
  const quoteRequestId = useRef(0);

  // Live quote, debounced -- re-quotes whenever the amount or target
  // asset changes, via a plain read (no transaction, no gas) against
  // the same QuoterV2 deployment the burn bot already trusts.
  useEffect(() => {
    const requestId = ++quoteRequestId.current;
    setQuotedOut(null);
    setQuoteError(null);
    if (!parsedAmount || !targetFee || !publicClient) return;

    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const [out] = await publicClient.readContract({
          address: QUOTER_V2_ADDRESS,
          abi: QUOTER_V2_ABI,
          functionName: "quoteExactInput",
          args: [encodePath(targetFee, target.address), parsedAmount],
        });
        if (quoteRequestId.current === requestId) setQuotedOut(out);
      } catch (err) {
        if (quoteRequestId.current === requestId) {
          setQuoteError(err.shortMessage || "Couldn't get a live quote for that amount.");
        }
      } finally {
        if (quoteRequestId.current === requestId) setQuoting(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [parsedAmount, targetFee, target, publicClient]);

  const minOut = quotedOut
    ? (quotedOut * BigInt(Math.round((100 - SLIPPAGE_PERCENT) * 100))) / 10000n
    : 0n;

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      if (pendingAction === "convert") {
        setAmount("");
        setQuotedOut(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, refetch]);

  const needsApproval = allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
  const busy = isPending || isConfirming;

  function handleApprove() {
    setPendingAction("approve");
    reset();
    writeContract({
      address: CONTRACTS.beToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.rewardsRouter, maxUint256],
    });
  }

  function handleConvert() {
    setPendingAction("convert");
    reset();
    writeContract({
      address: CONTRACTS.rewardsRouter,
      abi: REWARDS_ROUTER_ABI,
      functionName: "convert",
      args: [target.address, parsedAmount, minOut],
    });
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {REWARD_TARGET_ASSETS.filter((a) => !a.isDefault).map((a) => (
          <button
            key={a.symbol}
            type="button"
            onClick={() => setTargetSymbol(a.symbol)}
            className={`rounded-xl border p-3 text-center transition-colors ${
              targetSymbol === a.symbol
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                : "border-[var(--color-line)] opacity-80 hover:opacity-100"
            }`}
          >
            <p className="font-mono text-sm text-[var(--color-accent)]">{a.symbol}</p>
            <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-1 leading-tight">
              {a.name}
            </p>
          </button>
        ))}
      </div>

      <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
        Your BE balance: {formatToken(beBalance)} — enter how much to convert into {targetSymbol}:
      </p>
      <div className="relative mb-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={busy}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl pl-4 pr-16 py-3 font-mono text-lg outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => beBalance !== undefined && setAmount(formatUnits(beBalance, 18))}
          disabled={busy}
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-2 py-1 hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
        >
          MAX
        </button>
      </div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mb-3 min-h-[1.5em]">
        {quoting
          ? "Getting a live quote…"
          : quoteError
            ? quoteError
            : quotedOut
              ? `≈ ${formatToken(quotedOut)} ${targetSymbol} (min ${formatToken(minOut)} after ${SLIPPAGE_PERCENT}% slippage tolerance)`
              : parsedAmount > 0n
                ? "Waiting for a quote…"
                : ""}
      </p>

      {error && (
        <p className="font-mono text-[10px] text-[var(--color-danger)] mb-3">
          {error.shortMessage || error.message}
        </p>
      )}

      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={busy || parsedAmount === 0n}
          className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {busy ? "CONFIRMING…" : "APPROVE BE"}
        </button>
      ) : (
        <button
          onClick={handleConvert}
          disabled={busy || parsedAmount === 0n || !quotedOut}
          className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {busy ? "CONFIRMING…" : `CONVERT TO ${targetSymbol}`}
        </button>
      )}
      {isConfirmed && pendingAction === "convert" && (
        <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
          Converted.{" "}
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
      {isConfirmed && pendingAction === "approve" && (
        <p className="font-mono text-[10px] text-[var(--color-muted)] mt-3 text-center">
          Approved — click CONVERT below to actually swap it.
        </p>
      )}
    </>
  );
}

export default function RewardChoicePreview() {
  const live = isRewardsRouterLive();

  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
          CHOOSE YOUR REWARD {live ? "" : "· PREVIEW"}
        </p>
        {!live && (
          <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2 py-0.5 tracking-widest shrink-0">
            NOT LIVE
          </span>
        )}
      </div>
      {live ? <LiveConverter /> : <StaticPreview />}
    </div>
  );
}
