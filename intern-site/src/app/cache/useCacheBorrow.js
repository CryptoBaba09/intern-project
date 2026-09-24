"use client";

// Live reads for one CacheBorrow market (see CACHE_BORROW_MARKETS in
// lib/chain.js -- pass one entry in as `market`, not a global). Position
// state (collateral/borrowShares/supplyShares) is read straight off
// Morpho Blue itself via MORPHO_ABI, not off CacheBorrow -- the whole
// point of the non-custodial design is that a user's real position
// lives on Morpho, keyed by their own address, never by CacheBorrow's
// (see docs/cache-borrow-spec.md). market() gives the same market's
// totals, used only to turn raw shares into an approximate assets
// figure for display -- Morpho's real virtual-shares accounting is a
// little more precise than the simple ratio used here, so this is
// clearly labeled "~" (approximately) everywhere it's shown, never
// treated as the exact number a real repay/withdraw would use (those
// calls pass raw shares themselves, not this approximation).
//
// Collateral value / max-borrow / health factor are computed here from
// a live on-chain oracle read (ORACLE_ABI.price()), using the exact
// formula Morpho.sol's own _isHealthy() uses -- verified against
// Morpho Blue's real source, not assumed. This is the one place on
// this page real money-safety math happens, so it deliberately never
// depends on the /api/cache/market-apy route (display-only, APY
// numbers) or on anything else that could be stale/down without the
// UI knowing.
import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS } from "../lib/chain";
import { ERC20_ABI, CACHE_BORROW_ABI, MORPHO_ABI, ORACLE_ABI } from "../lib/abis";

const ORACLE_PRICE_SCALE = 1_000_000_000_000_000_000_000_000_000_000_000_000n; // 1e36
const WAD = 1_000_000_000_000_000_000n; // 1e18
const COLLATERAL_DECIMALS = 18; // true for both TSLA and NVDA, verified on-chain

// The oracle's raw price() integer is scaled so that
// collateral_raw * price / 1e36 = value_in_loanAsset_raw always holds,
// regardless of either token's decimals (that adjustment is baked into
// the number the oracle itself returns -- see ORACLE_ABI's own
// comment). To turn that raw integer into a human "$X per 1 whole
// collateral token" figure, though, you divide by
// 36 + loanDecimals - collateralDecimals, not a flat 1e36 -- getting
// this wrong doesn't affect any real transaction (nothing on-chain
// reads this constant), just what the price display shows.
const ORACLE_PRICE_DISPLAY_DECIMALS = 36 + CONTRACTS.usdgDecimals - COLLATERAL_DECIMALS;

export function formatToken(value, decimals = 18, maxFractionDigits = 4) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatUsd(value, decimals = 18, maxFractionDigits = 2) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  });
}

// Converts a raw share amount to an approximate underlying-asset
// amount using the market's own totalX/totalXShares ratio -- 0 when
// there are no shares yet (avoids a divide-by-zero before the market
// has any real activity).
function sharesToAssetsApprox(shares, totalShares, totalAssets) {
  if (!shares || !totalShares || totalShares === 0n) return 0n;
  return (shares * totalAssets) / totalShares;
}

// Live borrow/supply APY for one market, from /api/cache/market-apy
// (display-only -- see that route's own comment on why nothing
// safety-critical depends on it). Fetched per marketId, polled the
// same 60s the API route itself revalidates at, so a poll in between
// just re-serves the same cached value rather than re-hitting Morpho.
function useMarketApy(marketId) {
  const [state, setState] = useState({ loading: true, rates: null });

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;

    function load() {
      fetch(`/api/cache/market-apy?ids=${marketId}`)
        .then((res) => res.json())
        .then((json) => {
          if (cancelled) return;
          setState({ loading: false, rates: json.rates?.[marketId] ?? null, error: json.error });
        })
        .catch(() => !cancelled && setState({ loading: false, rates: null, error: "unreachable" }));
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [marketId]);

  return state;
}

export function useCacheBorrow(market) {
  const { address } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.usdgToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      { address: market.collateralToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      {
        address: CONTRACTS.usdgToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.cacheBorrow],
      },
      {
        address: market.collateralToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.cacheBorrow],
      },
      { address: CONTRACTS.cacheBorrow, abi: CACHE_BORROW_ABI, functionName: "feeBps" },
      { address: CONTRACTS.cacheBorrow, abi: CACHE_BORROW_ABI, functionName: "id", args: [market] },
      // Live oracle price -- same read Morpho itself uses to decide
      // liquidation, polled alongside everything else on this page.
      { address: market.oracle, abi: ORACLE_ABI, functionName: "price" },
    ],
    query: { enabled: Boolean(address) && Boolean(CONTRACTS.cacheBorrow), refetchInterval: 8000 },
  });
  const [usdgBalance, collateralBalance, usdgAllowance, collateralAllowance, feeBps, marketId, oraclePrice] =
    data?.map((d) => d.result) ?? [];

  const { data: positionData, refetch: refetchPosition } = useReadContracts({
    contracts: [
      { address: CONTRACTS.morpho, abi: MORPHO_ABI, functionName: "position", args: [marketId, address] },
      { address: CONTRACTS.morpho, abi: MORPHO_ABI, functionName: "market", args: [marketId] },
      { address: CONTRACTS.cacheBorrow, abi: CACHE_BORROW_ABI, functionName: "isMarketAllowed", args: [marketId] },
    ],
    query: { enabled: Boolean(marketId) && Boolean(address), refetchInterval: 8000 },
  });
  const [position, marketState, marketAllowed] = positionData?.map((d) => d.result) ?? [];

  const [supplyShares, borrowShares, collateral] = position ?? [];
  const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares] = marketState ?? [];

  const supplyAssetsApprox = sharesToAssetsApprox(supplyShares, totalSupplyShares, totalSupplyAssets);
  const borrowAssetsApprox = sharesToAssetsApprox(borrowShares, totalBorrowShares, totalBorrowAssets);

  // collateralValueLoan: your posted collateral's value in USDG terms,
  // at the live oracle price. maxBorrowAtLltv: the most you could ever
  // borrow against it at this market's lltv -- the exact threshold
  // Morpho liquidates past, not a made-up "recommended max." Both 0n
  // (not undefined) once collateral/oraclePrice resolve, so downstream
  // math never has to special-case "still loading" vs "genuinely zero."
  const collateralValueLoan =
    collateral !== undefined && oraclePrice !== undefined
      ? (collateral * oraclePrice) / ORACLE_PRICE_SCALE
      : undefined;
  const maxBorrowAtLltv =
    collateralValueLoan !== undefined ? (collateralValueLoan * market.lltv) / WAD : undefined;

  // healthFactor: maxBorrowAtLltv / borrowed, same ratio Morpho's own
  // _isHealthy() checks (healthy iff maxBorrow >= borrowed, i.e. HF >=
  // 1). null = no debt (infinite headroom), undefined = still loading.
  // Kept as a plain float for display only -- every real transaction
  // still passes raw amounts, never this ratio.
  let healthFactor;
  if (maxBorrowAtLltv === undefined || borrowAssetsApprox === undefined) {
    healthFactor = undefined;
  } else if (borrowAssetsApprox === 0n) {
    healthFactor = null; // no debt -> infinite
  } else {
    // Scale up before dividing so a healthy-but-close position (e.g.
    // 1.004) doesn't round away to a misleading "1.00" or "1".
    healthFactor = Number((maxBorrowAtLltv * 10_000n) / borrowAssetsApprox) / 10_000;
  }

  // currentLtvPercent: what fraction of your collateral's value is
  // currently borrowed, 0-100 (relative to collateral value, not to
  // lltv) -- the number a progress bar toward market.lltv is drawn
  // against.
  const currentLtvPercent =
    collateralValueLoan !== undefined && collateralValueLoan > 0n && borrowAssetsApprox !== undefined
      ? Number((borrowAssetsApprox * 10_000n) / collateralValueLoan) / 100
      : 0;

  const apy = useMarketApy(marketId);

  function refetchAll() {
    refetch();
    refetchPosition();
  }

  return {
    market,
    marketId,
    marketAllowed,
    usdgBalance,
    collateralBalance,
    usdgAllowance,
    collateralAllowance,
    feeBps,
    collateral, // raw collateral posted, in the market's own units
    supplyShares,
    borrowShares,
    supplyAssetsApprox, // ~USDG currently supplied (principal + accrued interest)
    borrowAssetsApprox, // ~USDG currently owed (principal + accrued interest)
    totalSupplyAssets,
    totalBorrowAssets,
    oraclePrice, // raw 1e36-convention price -- see ORACLE_PRICE_DISPLAY_DECIMALS for how to display it
    oraclePriceDisplayDecimals: ORACLE_PRICE_DISPLAY_DECIMALS,
    collateralValueLoan, // your collateral's live value, in USDG's own raw (6-decimal) units
    maxBorrowAtLltv, // the most you could ever borrow at this market's lltv, raw USDG units
    healthFactor, // undefined = loading, null = no debt, else a ratio (>=1 healthy)
    currentLtvPercent,
    lltvPercent: Number(market.lltv) / 1e16, // e.g. 62.5
    apy, // { loading, rates: { borrowApy, supplyApy, utilization } | null, error }
    usdgDecimals: CONTRACTS.usdgDecimals, // 6 -- every USDG parseUnits/formatUnits call must use this, not 18
    refetch: refetchAll,
  };
}
