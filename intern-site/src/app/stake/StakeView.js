"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  useAccount,
  useReadContracts,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import ConnectWalletButton from "../components/ConnectWalletButton";
import { Reveal, fadeUp, staggerContainer } from "../components/motion";
import { CONTRACTS, isStakingLive } from "../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../lib/abis";

function useTokenDecimals(address) {
  const { data } = useReadContract({
    address: address || undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(address) },
  });
  return data ?? 18;
}

// Raw formatUnits() output is a full-precision decimal string ("1519071.9488818153...")
// -- unreadable as a stat. This rounds for display only; every on-chain call still
// uses the exact bigint values, never this formatted string.
function formatToken(value, decimals, maxFractionDigits = 4) {
  if (value === undefined) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function StatCard({ label, value, suffix, accent }) {
  return (
    <div
      className={`rounded-2xl border p-5 bg-[#0F1113] ${
        accent ? "border-[#D9A441]/30" : "border-[#1B1D1B]"
      }`}
    >
      <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-2">{label}</p>
      <p
        className={`font-mono text-2xl truncate ${accent ? "text-[#D9A441]" : "text-[#EDEEF0]"}`}
      >
        {value} {suffix && <span className="text-sm text-[#9BA1A6]">{suffix}</span>}
      </p>
    </div>
  );
}

function ComingSoon() {
  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full text-center">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        STAKE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-4">
        Staking opens at launch
      </Reveal>
      <Reveal as="p" delay={0.1} className="text-[#9BA1A6] text-base leading-relaxed">
        The staking contract is built and unit-tested — see the{" "}
        <a href="/tokenomics" className="text-[#00C805] hover:underline">
          tokenomics page
        </a>{" "}
        for the full fee-split breakdown. It goes live once $INTERN is
        trading on PAIR and the contract has had an independent security
        review.
      </Reveal>
    </section>
  );
}

function ConnectPrompt() {
  return (
    <section className="px-6 pt-16 pb-24 max-w-3xl mx-auto w-full text-center">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        STAKE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-8">
        Connect a wallet to stake
      </Reveal>
      <Reveal delay={0.1} className="flex justify-center">
        <ConnectWalletButton />
      </Reveal>
    </section>
  );
}

function TxStatusBanner({ pendingLabel, txHash, isConfirming, isConfirmed, error }) {
  if (!txHash && !error) return null;
  return (
    <div
      className={`rounded-xl border px-4 py-3 mb-6 font-mono text-xs flex items-center justify-between gap-3 ${
        error
          ? "border-[#E5484D]/40 text-[#E5484D]"
          : isConfirmed
            ? "border-[#00C805]/40 text-[#00C805]"
            : "border-[#D9A441]/40 text-[#D9A441]"
      }`}
    >
      <span>
        {error
          ? error.shortMessage || error.message || "Transaction failed."
          : isConfirmed
            ? "Confirmed."
            : isConfirming
              ? `${pendingLabel} — confirming…`
              : "Waiting for wallet confirmation…"}
      </span>
      {txHash && (
        <a
          href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline shrink-0 opacity-80 hover:opacity-100"
        >
          View on Blockscout ↗
        </a>
      )}
    </div>
  );
}

function AmountInput({ value, onChange, onMax, disabled }) {
  return (
    <div className="relative mb-4">
      <input
        type="text"
        inputMode="decimal"
        placeholder="0.0"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        disabled={disabled}
        className="w-full bg-[#0B0C0B] border border-[#1B1D1B] rounded-xl pl-4 pr-16 py-3 font-mono text-lg outline-none focus:border-[#00C805]/50 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onMax}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-medium text-[#00C805] border border-[#00C805]/30 rounded-lg px-2 py-1 hover:bg-[#00C805]/10 transition-colors disabled:opacity-50"
      >
        MAX
      </button>
    </div>
  );
}

function StakeDashboard() {
  const { address } = useAccount();
  const internDecimals = useTokenDecimals(CONTRACTS.internToken);
  const beDecimals = useTokenDecimals(CONTRACTS.beToken);

  const [mode, setMode] = useState("stake"); // "stake" | "unstake"
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { data, refetch } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.internToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: CONTRACTS.internToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.distributor],
      },
      {
        address: CONTRACTS.distributor,
        abi: STAKING_REWARDS_ABI,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: CONTRACTS.distributor,
        abi: STAKING_REWARDS_ABI,
        functionName: "earned",
        args: [address],
      },
      {
        address: CONTRACTS.distributor,
        abi: STAKING_REWARDS_ABI,
        functionName: "totalStaked",
      },
    ],
    query: { enabled: Boolean(address), refetchInterval: 6000 },
  });

  const [walletBalance, allowance, staked, earned, totalStaked] =
    data?.map((d) => d.result) ?? [];

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      setStakeAmount("");
      setWithdrawAmount("");
    }
  }, [isConfirmed, refetch]);

  function switchMode(next) {
    setMode(next);
    reset();
  }

  const parsedStakeAmount = useMemo(() => {
    try {
      return stakeAmount ? parseUnits(stakeAmount, internDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [stakeAmount, internDecimals]);

  const parsedWithdrawAmount = useMemo(() => {
    try {
      return withdrawAmount ? parseUnits(withdrawAmount, internDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [withdrawAmount, internDecimals]);

  const needsApproval =
    allowance !== undefined && parsedStakeAmount > 0n && allowance < parsedStakeAmount;
  const busy = isPending || isConfirming;

  function handleApprove() {
    writeContract({
      address: CONTRACTS.internToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.distributor, maxUint256],
    });
  }

  function handleStake() {
    writeContract({
      address: CONTRACTS.distributor,
      abi: STAKING_REWARDS_ABI,
      functionName: "stake",
      args: [parsedStakeAmount],
    });
  }

  function handleWithdraw() {
    writeContract({
      address: CONTRACTS.distributor,
      abi: STAKING_REWARDS_ABI,
      functionName: "withdraw",
      args: [parsedWithdrawAmount],
    });
  }

  function handleClaim() {
    writeContract({
      address: CONTRACTS.distributor,
      abi: STAKING_REWARDS_ABI,
      functionName: "getReward",
    });
  }

  function handleExit() {
    writeContract({
      address: CONTRACTS.distributor,
      abi: STAKING_REWARDS_ABI,
      functionName: "exit",
    });
  }

  return (
    <section className="px-6 pt-16 pb-24 max-w-4xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[#00C805] tracking-widest mb-3">
        STAKE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-2">
        Stake $INTERN, earn BE
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[#9BA1A6] text-base leading-relaxed max-w-2xl mb-10"
      >
        Rewards stream continuously from every creator fee claim,
        time-weighted by how long you&apos;ve held your stake. Unstake any
        time — this is not a lockup.
      </Reveal>

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="grid sm:grid-cols-3 gap-4 mb-10"
      >
        <motion.div variants={fadeUp}>
          <StatCard
            label="YOUR $INTERN BALANCE"
            value={formatToken(walletBalance, internDecimals)}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="YOUR STAKED $INTERN"
            value={formatToken(staked, internDecimals)}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="YOUR CLAIMABLE BE"
            value={formatToken(earned, beDecimals, 6)}
            accent
          />
        </motion.div>
      </motion.div>

      <TxStatusBanner
        pendingLabel={needsApproval ? "Approving" : mode === "stake" ? "Staking" : "Unstaking"}
        txHash={txHash}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={error}
      />

      <div className="rounded-2xl border border-[#1B1D1B] bg-[#0F1113] p-6">
        <div className="flex gap-2 mb-5">
          {["stake", "unstake"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-xl font-mono text-sm font-medium py-2.5 transition-colors ${
                mode === m
                  ? "bg-[#00C805] text-[#0B0C0B]"
                  : "border border-[#1B1D1B] text-[#9BA1A6] hover:border-[#00C805]/50"
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {mode === "stake" ? (
          <>
            <AmountInput
              value={stakeAmount}
              onChange={setStakeAmount}
              onMax={() =>
                walletBalance !== undefined &&
                setStakeAmount(formatUnits(walletBalance, internDecimals))
              }
              disabled={busy}
            />
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={busy || parsedStakeAmount === 0n}
                className="w-full rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium py-3 hover:bg-[#00b304] transition-colors disabled:opacity-40"
              >
                {busy ? "CONFIRMING…" : "APPROVE $INTERN"}
              </button>
            ) : (
              <button
                onClick={handleStake}
                disabled={busy || parsedStakeAmount === 0n}
                className="w-full rounded-xl bg-[#00C805] text-[#0B0C0B] font-mono text-sm font-medium py-3 hover:bg-[#00b304] transition-colors disabled:opacity-40"
              >
                {busy ? "CONFIRMING…" : "STAKE"}
              </button>
            )}
            {needsApproval && (
              <p className="font-mono text-[10px] text-[#4A4F54] mt-3 text-center">
                One-time approval, then a separate STAKE transaction — standard for any
                ERC-20, not two charges.
              </p>
            )}
          </>
        ) : (
          <>
            <AmountInput
              value={withdrawAmount}
              onChange={setWithdrawAmount}
              onMax={() =>
                staked !== undefined && setWithdrawAmount(formatUnits(staked, internDecimals))
              }
              disabled={busy}
            />
            <button
              onClick={handleWithdraw}
              disabled={busy || parsedWithdrawAmount === 0n}
              className="w-full rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium py-3 hover:border-[#00C805]/50 transition-colors disabled:opacity-40"
            >
              {busy ? "CONFIRMING…" : "UNSTAKE"}
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button
          onClick={handleClaim}
          disabled={busy || !earned}
          className="flex-1 rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium py-3 hover:border-[#D9A441]/50 transition-colors disabled:opacity-40"
        >
          CLAIM BE
        </button>
        <button
          onClick={handleExit}
          disabled={busy || !staked}
          className="flex-1 rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium py-3 hover:border-[#9BA1A6] transition-colors disabled:opacity-40"
        >
          EXIT (UNSTAKE ALL + CLAIM)
        </button>
      </div>

      <p className="font-mono text-[10px] text-[#4A4F54] mt-8 leading-relaxed max-w-2xl">
        Total $INTERN staked across all wallets: {formatToken(totalStaked, internDecimals, 0)}.
        Staking is non-custodial — this contract only holds your $INTERN
        while staked, and only pays out BE it has actually received. It has
        NOT had a professional security audit; stake at your own risk.
      </p>
    </section>
  );
}

export default function StakeView() {
  const { isConnected } = useAccount();

  if (!isStakingLive()) return <ComingSoon />;
  if (!isConnected) return <ConnectPrompt />;
  return <StakeDashboard />;
}
