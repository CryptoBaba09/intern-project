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
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS } from "../lib/chain";
import { ERC20_ABI, CACHE_BORROW_ABI, MORPHO_ABI } from "../lib/abis";

export function formatToken(value, decimals = 18, maxFractionDigits = 4) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
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
    ],
    query: { enabled: Boolean(address) && Boolean(CONTRACTS.cacheBorrow), refetchInterval: 8000 },
  });
  const [usdgBalance, collateralBalance, usdgAllowance, collateralAllowance, feeBps, marketId] =
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
    refetch: refetchAll,
  };
}
