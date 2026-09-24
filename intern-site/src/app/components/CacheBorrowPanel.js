"use client";

// CacheBorrow's real, live write flow -- deposit/withdraw collateral,
// borrow/repay USDG, or supply/withdraw USDG as a lender, all scoped
// to one allowlisted market at a time (see CACHE_BORROW_MARKETS in
// lib/chain.js). Three of the six actions (borrow, withdrawCollateral,
// withdrawSupply) are gated by Morpho's own authorization check on
// real Morpho Blue -- lib/morphoAuth.js's signAuthBundle() builds and
// signs the grant+revoke pair those need, two free off-chain signs
// per action, never a standing approval (see CacheBorrow.sol's own
// NatSpec for the full "why"). The other three (depositCollateral,
// repay, supply) are permissionless on Morpho and need only the usual
// ERC-20 approval.
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContracts, useSignTypedData, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { CONTRACTS, CACHE_BORROW_MARKETS, isCacheBorrowLive } from "../lib/chain";
import { ERC20_ABI, CACHE_BORROW_ABI, MORPHO_ABI } from "../lib/abis";
import { signAuthBundle } from "../lib/morphoAuth";
import { useCacheBorrow, formatToken, formatUsd } from "../cache/useCacheBorrow";

const BLOCKSCOUT_ADDRESS_URL = "https://robinhoodchain.blockscout.com/address/";

// Percentage of true max-at-lltv the MAX button on the borrow input
// targets, rather than the exact liquidation line -- borrowing right up
// to health factor 1.00 means the very next price tick can liquidate
// you. Fenn.cash's own MAX button doesn't disclose a buffer; this one
// does, in the copy right under the button.
const SAFE_BORROW_BUFFER_PERCENT = 90;

function pctColor(healthFactor) {
  if (healthFactor === null || healthFactor === undefined) return "var(--color-accent)";
  if (healthFactor >= 1.5) return "var(--color-accent)";
  if (healthFactor >= 1.1) return "var(--color-ember)";
  return "var(--color-danger)";
}

function healthFactorLabel(healthFactor) {
  if (healthFactor === undefined) return "…";
  if (healthFactor === null) return "∞";
  return healthFactor.toFixed(2);
}

// Same shape as StakeView's stat cards, sized down. `sub` is an
// optional second, muted line (a $ conversion, a live rate, etc.).
function InfoCell({ label, value, sub, valueColor }) {
  return (
    <div>
      <p className="font-mono text-[9px] text-[var(--color-muted-2)] tracking-widest mb-1">{label}</p>
      <p className="font-mono text-sm" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {sub && <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-0.5">{sub}</p>}
    </div>
  );
}

// Health factor as a colored bar, same convention Morpho itself
// liquidates on: healthy iff >= 1.00. Visually capped at 3x so one
// very safe position doesn't make the bar always look empty at
// realistic values -- the capping only affects the bar's fill, never
// the number shown next to it.
function HealthFactorBar({ healthFactor }) {
  if (healthFactor === undefined) {
    return <div className="h-2 rounded-full bg-[var(--color-line)]" />;
  }
  const pct = healthFactor === null ? 100 : Math.max(4, Math.min(100, (healthFactor / 3) * 100));
  return (
    <div className="h-2 rounded-full bg-[var(--color-line)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: pctColor(healthFactor) }}
      />
    </div>
  );
}

// Your live position on this market -- collateral posted (with its
// live $ value), debt owed, current LTV against this market's real
// lltv, and the health-factor bar. All the numbers a user actually
// needs to judge their own liquidation risk, in one place, instead of
// scattered across separate boxes the way this panel used to show them.
function PositionSummary({ cb, market }) {
  return (
    <div className="border border-[var(--color-line)] rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-widest">YOUR POSITION</p>
        <span className="font-mono text-xs" style={{ color: pctColor(cb.healthFactor) }}>
          HEALTH FACTOR {healthFactorLabel(cb.healthFactor)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-3">
        <InfoCell
          label={`${market.symbol} COLLATERAL`}
          value={formatToken(cb.collateral)}
          sub={cb.collateralValueLoan !== undefined ? `≈ ${formatUsd(cb.collateralValueLoan)}` : undefined}
        />
        <InfoCell label="DEBT · USDG" value={`~${formatToken(cb.borrowAssetsApprox)}`} />
        <InfoCell
          label="LTV NOW / MAX"
          value={`${cb.currentLtvPercent.toFixed(1)}% / ${cb.lltvPercent}%`}
        />
      </div>
      <HealthFactorBar healthFactor={cb.healthFactor} />
      <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
        Below 1.00, your collateral can be liquidated. Higher is safer — this uses the same live
        price Morpho itself would liquidate against.
      </p>
    </div>
  );
}

// The market's own live facts -- price, this market's real lltv, and
// live borrow/supply APY straight from Morpho, plus the collateral
// token's own contract + price feed for anyone who wants to verify it
// themselves (same "verify it yourself" spirit as /docs, just one
// click closer to where you'd actually use it).
function MarketInfoCard({ cb, market, apyField, apyLabel }) {
  const [showAddresses, setShowAddresses] = useState(false);
  const rate = cb.apy.rates?.[apyField];

  return (
    <div className="border border-[var(--color-line)] rounded-xl p-4 mb-5">
      <div className="grid grid-cols-3 gap-4">
        <InfoCell
          label={`${market.symbol} PRICE`}
          value={cb.oraclePrice !== undefined ? formatUsd(cb.oraclePrice, 36) : "…"}
        />
        <InfoCell label="MAX LTV (LIQ. THRESHOLD)" value={`${cb.lltvPercent}%`} />
        <InfoCell
          label={apyLabel}
          value={cb.apy.loading ? "…" : rate != null ? `${(rate * 100).toFixed(2)}%` : "—"}
        />
      </div>
      <button
        type="button"
        onClick={() => setShowAddresses((v) => !v)}
        className="font-mono text-[9px] text-[var(--color-accent)] mt-3 hover:underline"
      >
        {showAddresses ? "Hide" : "Verify"} {market.symbol} contract + price feed ↓
      </button>
      {showAddresses && (
        <div className="mt-2 space-y-1.5">
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] break-all">
            {market.symbol} token:{" "}
            <a
              href={`${BLOCKSCOUT_ADDRESS_URL}${market.collateralToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              {market.collateralToken}
            </a>
          </p>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] break-all">
            Price feed:{" "}
            <a
              href={`${BLOCKSCOUT_ADDRESS_URL}${market.oracle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              {market.oracle}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

const ROBINHOOD_CHAIN_ID = 4663;
// Same fixed, simple slippage choice CacheDepositPreview.js and
// RewardChoicePreview.js already make rather than exposing a raw knob.
const SLIPPAGE_PERCENT = 1;

function AmountInput({ value, onChange, onMax, disabled, placeholder = "0.0", usdValue, maxLabel = "MAX" }) {
  return (
    <div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={disabled}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl pl-4 pr-16 py-3 font-mono text-sm outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50"
        />
        {onMax && (
          <button
            type="button"
            onClick={onMax}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-2 py-1 hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
          >
            {maxLabel}
          </button>
        )}
      </div>
      {usdValue !== undefined && (
        <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-1">≈ {usdValue}</p>
      )}
    </div>
  );
}

function ActionButton({ onClick, disabled, busy, label, busyLabel = "CONFIRMING…" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-mono text-xs font-medium py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
    >
      {busy ? busyLabel : label}
    </button>
  );
}

function ErrorText({ error }) {
  if (!error) return null;
  return <p className="font-mono text-[10px] text-[var(--color-danger)] mt-2">{error.shortMessage || error.message}</p>;
}

// Shared by the three gated actions -- reads the caller's live Morpho
// nonce right before signing (never cached, see MORPHO_ABI's own
// comment on why), then produces the AuthBundle to pass as the
// contract call's last argument.
function useAuthBundleBuilder() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();

  return async function build() {
    return signAuthBundle({
      signTypedDataAsync,
      readNonce: () =>
        publicClient.readContract({
          address: CONTRACTS.morpho,
          abi: MORPHO_ABI,
          functionName: "nonce",
          args: [address],
        }),
      chainId: ROBINHOOD_CHAIN_ID,
      morphoAddress: CONTRACTS.morpho,
      authorizer: address,
      authorizedContract: CONTRACTS.cacheBorrow,
    });
  };
}

function CollateralAndBorrow({ market }) {
  const { address } = useAccount();
  const cb = useCacheBorrow(market);
  const buildAuthBundle = useAuthBundleBuilder();

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");
  const [busyAction, setBusyAction] = useState(null); // "approve" | "deposit" | "withdraw" | "borrow" | "repay"
  const [authPending, setAuthPending] = useState(false);

  const { writeContract, writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      cb.refetch();
      setDepositAmt("");
      setWithdrawAmt("");
      setBorrowAmt("");
      setRepayAmt("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const busy = isPending || isConfirming || authPending;
  const needsCollateralApproval =
    cb.collateralAllowance !== undefined && depositAmt && cb.collateralAllowance < parseUnits(depositAmt || "0", 18);

  function handleApproveCollateral() {
    setBusyAction("approve");
    reset();
    writeContract({
      address: market.collateralToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.cacheBorrow, maxUint256],
    });
  }

  function handleDeposit() {
    setBusyAction("deposit");
    reset();
    writeContract({
      address: CONTRACTS.cacheBorrow,
      abi: CACHE_BORROW_ABI,
      functionName: "depositCollateral",
      args: [market, parseUnits(depositAmt || "0", 18)],
    });
  }

  async function handleWithdraw() {
    setBusyAction("withdraw");
    reset();
    try {
      setAuthPending(true);
      const auth = await buildAuthBundle();
      setAuthPending(false);
      writeContractAsync({
        address: CONTRACTS.cacheBorrow,
        abi: CACHE_BORROW_ABI,
        functionName: "withdrawCollateral",
        args: [market, parseUnits(withdrawAmt || "0", 18), auth],
      });
    } catch {
      setAuthPending(false);
    }
  }

  async function handleBorrow() {
    setBusyAction("borrow");
    reset();
    try {
      setAuthPending(true);
      const auth = await buildAuthBundle();
      setAuthPending(false);
      const assets = parseUnits(borrowAmt || "0", 18);
      const feeBps = cb.feeBps ?? 20n;
      const expectedNet = assets - (assets * feeBps) / 10_000n;
      const minReceived = (expectedNet * BigInt(Math.round((100 - SLIPPAGE_PERCENT) * 100))) / 10000n;
      writeContractAsync({
        address: CONTRACTS.cacheBorrow,
        abi: CACHE_BORROW_ABI,
        functionName: "borrow",
        args: [market, assets, minReceived, auth],
      });
    } catch {
      setAuthPending(false);
    }
  }

  const needsUsdgApproval =
    cb.usdgAllowance !== undefined && repayAmt && cb.usdgAllowance < parseUnits(repayAmt || "0", 18);

  function handleApproveUsdg() {
    setBusyAction("approveRepay");
    reset();
    writeContract({
      address: CONTRACTS.usdgToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.cacheBorrow, maxUint256],
    });
  }

  function handleRepay() {
    setBusyAction("repay");
    reset();
    // Repay by exact shares (the caller's full or partial outstanding
    // debt), maxAssetsIn set generously above the typed amount -- any
    // unused portion is swept straight back by the contract itself
    // (see CacheBorrow.sol's own repay(), same pattern CacheVaultDeposit
    // never needed but RewardChoicePreview's convert() established).
    const maxAssetsIn = parseUnits(repayAmt || "0", 18);
    writeContract({
      address: CONTRACTS.cacheBorrow,
      abi: CACHE_BORROW_ABI,
      functionName: "repay",
      args: [market, maxAssetsIn, 0n, maxAssetsIn],
    });
  }

  // Display-only $ estimates while typing -- never used for the actual
  // transaction amount, which always passes the raw typed value itself.
  function usdForCollateral(amountStr) {
    const amt = parseFloat(amountStr);
    if (!amt || Number.isNaN(amt) || cb.oraclePrice === undefined) return undefined;
    const priceFloat = Number(formatUnits(cb.oraclePrice, 36));
    return (amt * priceFloat).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }
  function usdForUsdg(amountStr) {
    const amt = parseFloat(amountStr);
    if (!amt || Number.isNaN(amt)) return undefined;
    return amt.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }

  // Targets a buffer under the exact liquidation line (health factor
  // 1.00), not the line itself -- see SAFE_BORROW_BUFFER_PERCENT.
  function handleMaxBorrow() {
    if (cb.maxBorrowAtLltv === undefined || cb.borrowAssetsApprox === undefined) return;
    const headroom = cb.maxBorrowAtLltv - cb.borrowAssetsApprox;
    if (headroom <= 0n) {
      setBorrowAmt("0");
      return;
    }
    setBorrowAmt(formatUnits((headroom * BigInt(SAFE_BORROW_BUFFER_PERCENT)) / 100n, 18));
  }

  if (!cb.marketId) return null;

  return (
    <div className="space-y-6">
      <PositionSummary cb={cb} market={market} />
      <MarketInfoCard cb={cb} market={market} apyField="borrowApy" apyLabel="LIVE BORROW APY" />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
            Deposit {market.symbol} — balance: {formatToken(cb.collateralBalance)}
          </p>
          <AmountInput
            value={depositAmt}
            onChange={setDepositAmt}
            onMax={() => cb.collateralBalance !== undefined && setDepositAmt(formatUnits(cb.collateralBalance, 18))}
            disabled={busy}
            usdValue={usdForCollateral(depositAmt)}
          />
          <div className="mt-2">
            {needsCollateralApproval ? (
              <ActionButton
                onClick={handleApproveCollateral}
                disabled={busy || !depositAmt}
                busy={busy && busyAction === "approve"}
                label={`APPROVE ${market.symbol}`}
              />
            ) : (
              <ActionButton
                onClick={handleDeposit}
                disabled={busy || !depositAmt}
                busy={busy && busyAction === "deposit"}
                label="DEPOSIT COLLATERAL"
              />
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
            Withdraw {market.symbol} — posted: {formatToken(cb.collateral)}
          </p>
          <AmountInput
            value={withdrawAmt}
            onChange={setWithdrawAmt}
            onMax={() => cb.collateral !== undefined && setWithdrawAmt(formatUnits(cb.collateral, 18))}
            disabled={busy}
            usdValue={usdForCollateral(withdrawAmt)}
          />
          <div className="mt-2">
            <ActionButton
              onClick={handleWithdraw}
              disabled={busy || !withdrawAmt}
              busy={busy && busyAction === "withdraw"}
              busyLabel={authPending && busyAction === "withdraw" ? "SIGN IN WALLET…" : "CONFIRMING…"}
              label="WITHDRAW COLLATERAL"
            />
          </div>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
            Reverts on-chain if it would leave your position unhealthy.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-6">
        <div>
          <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">Borrow USDG against your collateral</p>
          <AmountInput
            value={borrowAmt}
            onChange={setBorrowAmt}
            onMax={handleMaxBorrow}
            disabled={busy}
            usdValue={usdForUsdg(borrowAmt)}
          />
          <div className="mt-2">
            <ActionButton
              onClick={handleBorrow}
              disabled={busy || !borrowAmt}
              busy={busy && busyAction === "borrow"}
              busyLabel={authPending && busyAction === "borrow" ? "SIGN IN WALLET…" : "CONFIRMING…"}
              label="BORROW USDG"
            />
          </div>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
            MAX leaves a {100 - SAFE_BORROW_BUFFER_PERCENT}% safety buffer under your liquidation line, not the exact
            line.
            {cb.feeBps !== undefined && ` ${Number(cb.feeBps) / 100}% skimmed, auto-bought-back and burned.`}
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
            Repay — owed: ~{formatToken(cb.borrowAssetsApprox)} USDG
          </p>
          <AmountInput
            value={repayAmt}
            onChange={setRepayAmt}
            onMax={() => cb.borrowAssetsApprox !== undefined && setRepayAmt(formatUnits(cb.borrowAssetsApprox, 18))}
            disabled={busy}
            usdValue={usdForUsdg(repayAmt)}
          />
          <div className="mt-2">
            {needsUsdgApproval ? (
              <ActionButton
                onClick={handleApproveUsdg}
                disabled={busy || !repayAmt}
                busy={busy && busyAction === "approveRepay"}
                label="APPROVE USDG"
              />
            ) : (
              <ActionButton
                onClick={handleRepay}
                disabled={busy || !repayAmt}
                busy={busy && busyAction === "repay"}
                label="REPAY"
              />
            )}
          </div>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
            Any amount not actually owed is swept back to you in the same transaction.
          </p>
        </div>
      </div>

      <ErrorText error={error} />
      {isConfirmed && (
        <p className="font-mono text-[10px] text-[var(--color-accent)]">
          Done —{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            view on Blockscout ↗
          </a>
        </p>
      )}
    </div>
  );
}

function SupplyAndEarn({ market }) {
  const { address } = useAccount();
  const cb = useCacheBorrow(market);
  const buildAuthBundle = useAuthBundleBuilder();

  const [supplyAmt, setSupplyAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [busyAction, setBusyAction] = useState(null);
  const [authPending, setAuthPending] = useState(false);

  const { writeContract, writeContractAsync, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      cb.refetch();
      setSupplyAmt("");
      setWithdrawAmt("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const busy = isPending || isConfirming || authPending;
  const needsUsdgApproval =
    cb.usdgAllowance !== undefined && supplyAmt && cb.usdgAllowance < parseUnits(supplyAmt || "0", 18);

  function handleApprove() {
    setBusyAction("approve");
    reset();
    writeContract({
      address: CONTRACTS.usdgToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.cacheBorrow, maxUint256],
    });
  }

  function handleSupply() {
    setBusyAction("supply");
    reset();
    const assets = parseUnits(supplyAmt || "0", 18);
    // No slippage floor here beyond 0 -- unlike borrow(), a fee-rate
    // change is the only variable, and it's the same feeBps read live
    // just above; a real share-price quote would need previewDeposit-
    // style read Morpho doesn't expose for supply the way the
    // Steakhouse vault does for CacheVaultDeposit.
    writeContract({
      address: CONTRACTS.cacheBorrow,
      abi: CACHE_BORROW_ABI,
      functionName: "supply",
      args: [market, assets, 0n],
    });
  }

  async function handleWithdraw() {
    setBusyAction("withdraw");
    reset();
    try {
      setAuthPending(true);
      const auth = await buildAuthBundle();
      setAuthPending(false);
      writeContractAsync({
        address: CONTRACTS.cacheBorrow,
        abi: CACHE_BORROW_ABI,
        functionName: "withdrawSupply",
        args: [market, parseUnits(withdrawAmt || "0", 18), 0n, auth],
      });
    } catch {
      setAuthPending(false);
    }
  }

  function usdForUsdg(amountStr) {
    const amt = parseFloat(amountStr);
    if (!amt || Number.isNaN(amt)) return undefined;
    return amt.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }

  if (!cb.marketId) return null;

  return (
    <div className="space-y-6">
      <div className="border border-[var(--color-line)] rounded-xl p-4">
        <p className="font-mono text-[9px] text-[var(--color-muted-2)] tracking-widest mb-1">
          YOUR SUPPLY · ~USDG (APPROX., INCL. EARNED)
        </p>
        <p className="font-mono text-lg">{formatToken(cb.supplyAssetsApprox)}</p>
      </div>
      <MarketInfoCard cb={cb} market={market} apyField="supplyApy" apyLabel="LIVE SUPPLY APY" />

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
            Supply USDG — balance: {formatToken(cb.usdgBalance)}
          </p>
          <AmountInput
            value={supplyAmt}
            onChange={setSupplyAmt}
            onMax={() => cb.usdgBalance !== undefined && setSupplyAmt(formatUnits(cb.usdgBalance, 18))}
            disabled={busy}
            usdValue={usdForUsdg(supplyAmt)}
          />
          <div className="mt-2">
            {needsUsdgApproval ? (
              <ActionButton
                onClick={handleApprove}
                disabled={busy || !supplyAmt}
                busy={busy && busyAction === "approve"}
                label="APPROVE USDG"
              />
            ) : (
              <ActionButton
                onClick={handleSupply}
                disabled={busy || !supplyAmt}
                busy={busy && busyAction === "supply"}
                label="SUPPLY"
              />
            )}
          </div>
          {cb.feeBps !== undefined && (
            <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">
              {Number(cb.feeBps) / 100}% skimmed once, auto-bought-back and burned.
            </p>
          )}
        </div>

        <div>
          <p className="font-mono text-[10px] text-[var(--color-muted)] mb-2">
            Withdraw — supplied: ~{formatToken(cb.supplyAssetsApprox)} USDG
          </p>
          <AmountInput
            value={withdrawAmt}
            onChange={setWithdrawAmt}
            onMax={() => cb.supplyAssetsApprox !== undefined && setWithdrawAmt(formatUnits(cb.supplyAssetsApprox, 18))}
            disabled={busy}
            usdValue={usdForUsdg(withdrawAmt)}
          />
          <div className="mt-2">
            <ActionButton
              onClick={handleWithdraw}
              disabled={busy || !withdrawAmt}
              busy={busy && busyAction === "withdraw"}
              busyLabel={authPending && busyAction === "withdraw" ? "SIGN IN WALLET…" : "CONFIRMING…"}
              label="WITHDRAW SUPPLY"
            />
          </div>
          <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-2">No fee — closing a position, not creating one.</p>
        </div>
      </div>

      <ErrorText error={error} />
      {isConfirmed && (
        <p className="font-mono text-[10px] text-[var(--color-accent)]">
          Done —{" "}
          <a
            href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            view on Blockscout ↗
          </a>
        </p>
      )}
    </div>
  );
}

export default function CacheBorrowPanel() {
  const { isConnected } = useAccount();
  const [marketSymbol, setMarketSymbol] = useState(CACHE_BORROW_MARKETS[0].symbol);
  const [mode, setMode] = useState("borrow"); // "borrow" | "supply"
  const market = CACHE_BORROW_MARKETS.find((m) => m.symbol === marketSymbol) ?? CACHE_BORROW_MARKETS[0];

  // Confirms the selected market is genuinely allowlisted on-chain
  // right now, rather than trusting the hardcoded CACHE_BORROW_MARKETS
  // list blindly -- id() is the same derivation CacheBorrow itself
  // uses, so this can never disagree with the real contract.
  const { data: idData } = useReadContracts({
    contracts: [{ address: CONTRACTS.cacheBorrow, abi: CACHE_BORROW_ABI, functionName: "id", args: [market] }],
    query: { enabled: Boolean(CONTRACTS.cacheBorrow) },
  });
  const marketId = idData?.[0]?.result;
  const { data: allowedData } = useReadContracts({
    contracts: [{ address: CONTRACTS.cacheBorrow, abi: CACHE_BORROW_ABI, functionName: "isMarketAllowed", args: [marketId] }],
    query: { enabled: Boolean(marketId) },
  });
  const confirmedAllowed = allowedData?.[0]?.result;

  if (!isCacheBorrowLive()) {
    return (
      <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6 text-center">
        <p className="font-mono text-xs text-[var(--color-muted)]">Coming soon.</p>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1 border border-[var(--color-line)] rounded-xl p-1">
          {CACHE_BORROW_MARKETS.map((m) => (
            <button
              key={m.symbol}
              onClick={() => setMarketSymbol(m.symbol)}
              className={`font-mono text-xs px-3 py-1.5 rounded-lg transition-colors ${
                marketSymbol === m.symbol
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              }`}
            >
              {m.symbol}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 border border-[var(--color-line)] rounded-xl p-1">
          <button
            onClick={() => setMode("borrow")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg transition-colors ${
              mode === "borrow" ? "bg-white/10 text-[var(--color-fg)]" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            Collateral &amp; Borrow
          </button>
          <button
            onClick={() => setMode("supply")}
            className={`font-mono text-xs px-3 py-1.5 rounded-lg transition-colors ${
              mode === "supply" ? "bg-white/10 text-[var(--color-fg)]" : "text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            }`}
          >
            Supply &amp; Earn
          </button>
        </div>
      </div>

      {!isConnected ? (
        <p className="font-mono text-xs text-[var(--color-muted)] text-center py-8">Connect a wallet to continue.</p>
      ) : confirmedAllowed === false ? (
        <p className="font-mono text-xs text-[var(--color-danger)] text-center py-8">
          {market.symbol} isn&apos;t allowlisted on the live contract right now — refusing to show a flow that would
          just revert.
        </p>
      ) : mode === "borrow" ? (
        <CollateralAndBorrow key={`${marketSymbol}-borrow`} market={market} />
      ) : (
        <SupplyAndEarn key={`${marketSymbol}-supply`} market={market} />
      )}
    </div>
  );
}
