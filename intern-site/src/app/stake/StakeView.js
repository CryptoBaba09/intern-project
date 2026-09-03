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

function StatCard({ label, value, suffix }) {
  return (
    <div className="border border-[#1B1D1B] p-5">
      <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-2">{label}</p>
      <p className="font-mono text-2xl text-[#EDEEF0] truncate">
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

function StakeDashboard() {
  const { address } = useAccount();
  const internDecimals = useTokenDecimals(CONTRACTS.internToken);
  const beDecimals = useTokenDecimals(CONTRACTS.beToken);

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

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) refetch();
  }, [isConfirmed, refetch]);

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
            value={
              walletBalance !== undefined
                ? formatUnits(walletBalance, internDecimals)
                : "—"
            }
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="YOUR STAKED $INTERN"
            value={staked !== undefined ? formatUnits(staked, internDecimals) : "—"}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard
            label="YOUR CLAIMABLE BE"
            value={earned !== undefined ? formatUnits(earned, beDecimals) : "—"}
          />
        </motion.div>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="border border-[#1B1D1B] p-6">
          <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-4">STAKE</p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-[#0B0C0B] border border-[#1B1D1B] rounded-xl px-4 py-3 font-mono text-lg outline-none focus:border-[#00C805]/50 mb-4"
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
        </div>

        <div className="border border-[#1B1D1B] p-6">
          <p className="font-mono text-xs text-[#9BA1A6] tracking-wide mb-4">UNSTAKE</p>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.0"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-[#0B0C0B] border border-[#1B1D1B] rounded-xl px-4 py-3 font-mono text-lg outline-none focus:border-[#00C805]/50 mb-4"
          />
          <button
            onClick={handleWithdraw}
            disabled={busy || parsedWithdrawAmount === 0n}
            className="w-full rounded-xl border border-[#1B1D1B] text-[#EDEEF0] font-mono text-sm font-medium py-3 hover:border-[#00C805]/50 transition-colors disabled:opacity-40"
          >
            {busy ? "CONFIRMING…" : "UNSTAKE"}
          </button>
        </div>
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
        Total $INTERN staked across all wallets:{" "}
        {totalStaked !== undefined ? formatUnits(totalStaked, internDecimals) : "—"}.
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
