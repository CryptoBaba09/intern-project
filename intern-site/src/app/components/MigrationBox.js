"use client";

// Seamless v1 -> v2 $INTERN migration, in three possible steps:
//   1. If a wallet still has v1 staked in the old (retired) staking
//      contract, it can't migrate what it doesn't hold yet -- prompt an
//      EXIT() there first (withdraws staked v1 + claims any pending v1
//      BE reward, in one tx).
//   2. APPROVE the migration contract to pull the wallet's v1 balance.
//   3. MIGRATE -- burns v1 to the dead address and pays v2 1:1, in one
//      atomic tx. See contracts/contracts/InternMigration.sol.
//
// Built after walking a real user through this by hand via Blockscout's
// unverified-contract "Custom ABI" flow -- decoding a raw bytecode
// constant to find the claim deadline, computing exact wei balances,
// three separate signatures. None of that is reasonable to ask a normal
// holder to do. This component is the actual fix: everything above
// happens automatically except the two signatures only a wallet owner
// can approve.
//
// Deliberately self-hiding when embedded elsewhere (e.g. the stake
// page): a wallet with nothing on v1 renders nothing at all, so this
// never nags someone who already migrated or never held v1. Pass
// `standalone` on the dedicated /migrate page to show an explicit
// "nothing to migrate" state instead of disappearing.
import { useEffect, useState } from "react";
import {
  useAccount,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, maxUint256 } from "viem";
import { CONTRACTS, MIGRATION_CLAIM_DEADLINE_FALLBACK } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI, MIGRATION_ABI } from "../lib/abis";
import Confetti from "./Confetti";

function formatToken(value, decimals = 18, maxFractionDigits = 4) {
  if (value === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function formatCountdown(deadlineSeconds) {
  if (!deadlineSeconds) return null;
  const msLeft = Number(deadlineSeconds) * 1000 - Date.now();
  if (msLeft <= 0) return null;
  const days = Math.floor(msLeft / 86_400_000);
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left to migrate`;
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left to migrate`;
}

function TxStatusLine({ label, txHash, isConfirming, isConfirmed, error }) {
  if (!txHash && !error) return null;
  return (
    <div
      className={`rounded-xl border px-4 py-3 mb-4 font-mono text-xs flex items-center justify-between gap-3 ${
        error
          ? "border-[var(--color-danger)]/40 text-[var(--color-danger)]"
          : isConfirmed
            ? "border-[var(--color-accent)]/40 text-[var(--color-accent)]"
            : "border-[var(--color-ember)]/40 text-[var(--color-ember)]"
      }`}
    >
      <span>
        {error
          ? error.shortMessage || error.message || "Transaction failed."
          : isConfirmed
            ? "Confirmed."
            : isConfirming
              ? `${label} — confirming…`
              : "Waiting for wallet confirmation…"}
      </span>
      {txHash && (
        <a
          href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline shrink-0 opacity-80 hover:opacity-100"
        >
          View ↗
        </a>
      )}
    </div>
  );
}

export default function MigrationBox({ standalone = false }) {
  const { address } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.v1Token, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      {
        address: CONTRACTS.v1Distributor,
        abi: STAKING_REWARDS_ABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: CONTRACTS.v1Token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.migration],
      },
      { address: CONTRACTS.migration, abi: MIGRATION_ABI, functionName: "claimDeadline" },
    ],
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  });

  const [v1Balance, v1Staked, v1Allowance, claimDeadline] = data?.map((d) => d.result) ?? [];

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) refetch();
  }, [isConfirmed, refetch]);

  const [countdown, setCountdown] = useState(null);
  useEffect(() => {
    const deadline = claimDeadline ?? BigInt(MIGRATION_CLAIM_DEADLINE_FALLBACK);
    const tick = () => setCountdown(formatCountdown(deadline));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [claimDeadline]);

  const busy = isPending || isConfirming;
  const hasStaked = Boolean(v1Staked && v1Staked > 0n);
  const hasWalletV1 = Boolean(v1Balance && v1Balance > 0n);
  const needsApproval = hasWalletV1 && v1Allowance !== undefined && v1Allowance < v1Balance;
  const windowClosed = countdown === null && claimDeadline !== undefined;

  function handleExit() {
    reset();
    writeContract({
      address: CONTRACTS.v1Distributor,
      abi: STAKING_REWARDS_ABI,
      functionName: "exit",
    });
  }

  function handleApprove() {
    reset();
    writeContract({
      address: CONTRACTS.v1Token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.migration, maxUint256],
    });
  }

  function handleMigrate() {
    reset();
    writeContract({
      address: CONTRACTS.migration,
      abi: MIGRATION_ABI,
      functionName: "migrate",
      args: [v1Balance],
    });
  }

  const actionLabel = hasStaked ? "Unstaking v1" : needsApproval ? "Approving" : "Migrating";

  // Nothing to do and nothing to show -- stay invisible when embedded
  // (e.g. on /stake) rather than nag every wallet that never held v1.
  if (!hasStaked && !hasWalletV1 && !standalone) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
      <Confetti burstKey={isConfirmed ? txHash : null} />
      <div className="flex items-center justify-between mb-5 gap-3">
        <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
          V1 → V2 $INTERN MIGRATION
        </p>
        {countdown && (
          <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2 py-0.5 tracking-widest shrink-0 whitespace-nowrap">
            {countdown}
          </span>
        )}
      </div>

      {!hasStaked && !hasWalletV1 ? (
        <p className="font-mono text-sm text-[var(--color-fg)] text-center py-4">
          Nothing to migrate — this wallet holds no v1 $INTERN.
        </p>
      ) : (
        <>
          <TxStatusLine
            label={actionLabel}
            txHash={txHash}
            isConfirming={isConfirming}
            isConfirmed={isConfirmed}
            error={error}
          />

          {hasStaked ? (
            <>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                You still have{" "}
                <span className="text-[var(--color-fg)] font-mono">
                  {formatToken(v1Staked)}
                </span>{" "}
                v1 $INTERN staked in the old (retired) staking contract. Unstake it
                first — this also claims any BE it&apos;s still owed you.
              </p>
              <button
                onClick={handleExit}
                disabled={busy}
                className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
              >
                {busy ? "CONFIRMING…" : "UNSTAKE v1 (EXIT)"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-4">
                You have{" "}
                <span className="text-[var(--color-fg)] font-mono">
                  {formatToken(v1Balance)}
                </span>{" "}
                v1 $INTERN. Migrating burns it and pays you the same amount of v2
                $INTERN, 1:1, in one final step — no separate &quot;send to burn
                address&quot; needed.
              </p>
              {windowClosed ? (
                <p className="font-mono text-xs text-[var(--color-danger)] text-center py-3 border border-[var(--color-danger)]/30 rounded-xl">
                  The migration window has closed.
                </p>
              ) : needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
                >
                  {busy ? "CONFIRMING…" : "APPROVE v1 $INTERN"}
                </button>
              ) : (
                <button
                  onClick={handleMigrate}
                  disabled={busy}
                  className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
                >
                  {busy ? "CONFIRMING…" : `MIGRATE ${formatToken(v1Balance)} → V2`}
                </button>
              )}
              {needsApproval && !windowClosed && (
                <p className="font-mono text-[10px] text-[var(--color-muted-2)] mt-3 text-center">
                  One-time approval, then a separate MIGRATE transaction —
                  standard for any ERC-20, not two charges.
                </p>
              )}
            </>
          )}
        </>
      )}

      <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-5 leading-relaxed text-center">
        Migration ratio is fixed 1:1, enforced by the contract itself, not
        a quote that can drift. The migration contract has been
        unit-tested but not professionally audited —{" "}
        <a
          href={`https://robinhoodchain.blockscout.com/address/${CONTRACTS.migration}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--color-fg)]"
        >
          verify it yourself on Blockscout
        </a>
        .
      </p>
    </div>
  );
}
