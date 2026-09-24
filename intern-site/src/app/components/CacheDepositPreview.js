"use client";

// Cache's deposit flow -- same two-mode shape as RewardChoicePreview.js
// (InternRewardsRouter's front end): a honest static PREVIEW while
// CacheVaultDeposit isn't deployed yet (isCacheVaultLive() false), and
// a real approve-then-deposit() flow once it is. See
// docs/cache-intern-spec.md and contracts/contracts/CacheVaultDeposit.sol.
import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { CONTRACTS, isCacheVaultLive } from "../lib/chain";
import { ERC20_ABI, CACHE_VAULT_DEPOSIT_ABI, ERC4626_VAULT_ABI } from "../lib/abis";
import { formatUsdg, MORPHO_VAULT_URL } from "../cache/useCacheVault";

// 1% default slippage tolerance on the live preview quote -- same
// fixed, simple choice RewardChoicePreview.js makes rather than
// exposing a raw knob.
const SLIPPAGE_PERCENT = 1;

function StaticPreview() {
  return (
    <>
      <p className="font-mono text-xs text-[var(--color-fg)] text-center mb-3">
        Deposit USDG and earn real yield, non-custodially — your deposit and everything it earns land
        straight in your own wallet. This site never holds it.
      </p>
      <p className="font-mono text-[9px] text-[var(--color-muted-2)] leading-relaxed text-center">
        0.2% skimmed once, at deposit, auto-bought-back into $INTERN and burned — same rate as $interndex,
        no separate charge on top. Coming soon —{" "}
        <a href="/docs" className="underline">
          full technical detail on the docs page
        </a>
        .
      </p>
    </>
  );
}

function LiveDepositor() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [amount, setAmount] = useState("");
  const [minShares, setMinShares] = useState(0n);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // "approve" | "deposit"

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.usdgToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      {
        address: CONTRACTS.usdgToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.cacheVaultDeposit],
      },
      { address: CONTRACTS.cacheVaultDeposit, abi: CACHE_VAULT_DEPOSIT_ABI, functionName: "feeBps" },
    ],
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  });
  const [usdgBalance, allowance, feeBps] = data?.map((d) => d.result) ?? [];

  const parsedAmount = (() => {
    try {
      return amount ? parseUnits(amount, CONTRACTS.usdgDecimals) : 0n;
    } catch {
      return 0n;
    }
  })();

  const fee = feeBps !== undefined ? (parsedAmount * feeBps) / 10_000n : 0n;
  const netAssets = parsedAmount - fee;

  // Live preview quote: how many vault shares netAssets would mint
  // right now, read straight off the real vault (previewDeposit) --
  // then minShares is that, minus slippage tolerance, exactly what
  // gets passed on-chain to deposit()'s own minShares floor.
  useEffect(() => {
    setMinShares(0n);
    setQuoteError(null);
    if (!netAssets || !publicClient) return;
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const previewShares = await publicClient.readContract({
          address: CONTRACTS.cacheVault,
          abi: ERC4626_VAULT_ABI,
          functionName: "previewDeposit",
          args: [netAssets],
        });
        const floor = (previewShares * BigInt(Math.round((100 - SLIPPAGE_PERCENT) * 100))) / 10000n;
        setMinShares(floor);
      } catch (err) {
        setQuoteError(err.shortMessage || "Couldn't get a live share quote for that amount.");
      } finally {
        setQuoting(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [netAssets, publicClient]);

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      if (pendingAction === "deposit") {
        setAmount("");
        setMinShares(0n);
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
      address: CONTRACTS.usdgToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.cacheVaultDeposit, maxUint256],
    });
  }

  function handleDeposit() {
    setPendingAction("deposit");
    reset();
    writeContract({
      address: CONTRACTS.cacheVaultDeposit,
      abi: CACHE_VAULT_DEPOSIT_ABI,
      functionName: "deposit",
      args: [parsedAmount, minShares],
    });
  }

  return (
    <>
      <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
        Your USDG balance: {formatUsdg(usdgBalance)} — enter how much to deposit:
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
          onClick={() => usdgBalance !== undefined && setAmount(formatUnits(usdgBalance, CONTRACTS.usdgDecimals))}
          disabled={busy}
          className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-2 py-1 hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
        >
          MAX
        </button>
      </div>

      <p className="font-mono text-[10px] text-[var(--color-muted-2)] mb-3 min-h-[1.5em]">
        {feeBps !== undefined && parsedAmount > 0n
          ? `Fee: ${formatUsdg(fee)} USDG (${Number(feeBps) / 100}%) → burned. Net deposited: ${formatUsdg(netAssets)} USDG.`
          : ""}
        {quoting ? " Getting a live share quote…" : quoteError ? ` ${quoteError}` : ""}
      </p>

      {error && (
        <p className="font-mono text-[10px] text-[var(--color-danger)] mb-3">{error.shortMessage || error.message}</p>
      )}

      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={busy || parsedAmount === 0n}
          className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {busy ? "CONFIRMING…" : "APPROVE USDG"}
        </button>
      ) : (
        <button
          onClick={handleDeposit}
          disabled={busy || parsedAmount === 0n || minShares === 0n}
          className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {busy ? "CONFIRMING…" : "DEPOSIT INTO CACHE"}
        </button>
      )}
      {isConfirmed && pendingAction === "deposit" && (
        <p className="font-mono text-[10px] text-[var(--color-accent)] mt-3 text-center">
          Deposited.{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Blockscout ↗
          </a>{" "}
          — your vault shares are visible directly on{" "}
          <a href={MORPHO_VAULT_URL} target="_blank" rel="noopener noreferrer" className="underline">
            Morpho ↗
          </a>
          .
        </p>
      )}
      {isConfirmed && pendingAction === "approve" && (
        <p className="font-mono text-[10px] text-[var(--color-muted)] mt-3 text-center">
          Approved — click DEPOSIT INTO CACHE below to actually deposit.
        </p>
      )}
    </>
  );
}

export default function CacheDepositPreview() {
  const live = isCacheVaultLive();

  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
          DEPOSIT {live ? "" : "· PREVIEW"}
        </p>
        {!live && (
          <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2 py-0.5 tracking-widest shrink-0">
            NOT LIVE
          </span>
        )}
      </div>
      {live ? <LiveDepositor /> : <StaticPreview />}
    </div>
  );
}
