"use client";

// Live reads against the REAL Steakhouse USDG Morpho vault
// (CONTRACTS.cacheVault) -- these work regardless of whether
// CacheVaultDeposit itself is deployed yet (isCacheVaultLive()), since
// the vault is a separate, already-live, third-party contract this
// site doesn't own. TVL shown here is a real on-chain read
// (totalAssets()), not a cached/self-reported number -- see
// docs/cache-intern-spec.md for how the vault address itself was
// confirmed (bytecode selector check + live asset() read matching
// CONTRACTS.usdgToken exactly).
//
// APY is deliberately NOT computed here. A MetaMorpho vault's real
// supply APY depends on the underlying market's utilization/IRM curve
// across possibly several allocated markets -- reconstructing that
// correctly on-chain risks quietly going stale or simply being wrong
// in a way nobody would catch quickly. Morpho's own app already shows
// the real, live number; linking to it is more honest than a second,
// possibly-wrong copy on our own site (same reasoning this codebase
// already applies to buyback/burn numbers elsewhere -- "not self-
// reported, check every link yourself").
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACTS } from "../lib/chain";
import { ERC4626_VAULT_ABI, ERC20_ABI } from "../lib/abis";

export const MORPHO_VAULT_URL = `https://app.morpho.org/robinhood-chain/vault/${CONTRACTS.cacheVault}/steakhouse-usdg`;

export function formatUsdg(value, maxFractionDigits = 2) {
  if (value === undefined || value === null) return "—";
  // USDG is a USD-pegged stablecoin (same assumption this codebase
  // already makes for USDG elsewhere, e.g. RewardChoicePreview's
  // BE/USDG quoting) -- 18 decimals, 1 USDG ≈ $1.
  return Number(formatUnits(value, 18)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export function useCacheVault() {
  const { address } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: CONTRACTS.cacheVault, abi: ERC4626_VAULT_ABI, functionName: "totalAssets" },
      { address: CONTRACTS.usdgToken, abi: ERC20_ABI, functionName: "balanceOf", args: [address] },
      { address: CONTRACTS.cacheVault, abi: ERC4626_VAULT_ABI, functionName: "balanceOf", args: [address] },
    ],
    query: { enabled: Boolean(CONTRACTS.cacheVault), refetchInterval: 15000 },
  });

  const [totalAssets, usdgBalance, vaultShares] = data?.map((d) => d.result) ?? [];

  return {
    totalAssets, // real live TVL, in USDG's own 18-decimal units
    usdgBalance, // connected wallet's spendable USDG, if any
    vaultShares, // connected wallet's existing Steakhouse USDG vault shares, if any
    refetch,
  };
}
