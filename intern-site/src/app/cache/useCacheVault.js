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
// APY comes from /api/cache/vault-apy, which proxies Morpho's own
// vaultV2ByAddress -- their own already-computed number, not a second,
// possibly-wrong copy reconstructed here from allocation/IRM data
// (2026-09-24: an earlier pass assumed Morpho's API didn't index this
// vault at all, based on querying the classic vault schema instead of
// vaultV2ByAddress -- it does, this was a wrong assumption, not a real
// gap). Same "display-only, never safety-critical" status as the
// borrow-market APY in useCacheBorrow.js.
import { useAccount, useReadContracts } from "wagmi";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { CONTRACTS } from "../lib/chain";
import { ERC4626_VAULT_ABI, ERC20_ABI } from "../lib/abis";

export const MORPHO_VAULT_URL = `https://app.morpho.org/robinhood-chain/vault/${CONTRACTS.cacheVault}/steakhouse-usdg`;

// USDG is a USD-pegged stablecoin, 1 USDG ~= $1 -- but its real
// decimals() is 6, not 18 (verified live on-chain 2026-09-24, see
// CONTRACTS.usdgDecimals's own comment in lib/chain.js). This function
// used to hardcode 18, same bug CacheBorrowPanel had -- every number
// this formats (vault TVL, a wallet's USDG balance) was off by 10^12
// until this was fixed.
export function formatUsdg(value, maxFractionDigits = 2) {
  if (value === undefined || value === null) return "—";
  return Number(formatUnits(value, CONTRACTS.usdgDecimals)).toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export function useVaultApy() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/cache/vault-apy")
        .then((res) => res.json())
        .then((json) => !cancelled && setState({ loading: false, ...json }))
        .catch(() => !cancelled && setState({ loading: false, error: "unreachable" }));
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state; // { loading, apy, netApy, totalAssetsUsd, error }
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
    totalAssets, // real live TVL, in USDG's own 6-decimal units
    usdgBalance, // connected wallet's spendable USDG, if any
    vaultShares, // connected wallet's existing Steakhouse USDG vault shares, if any
    refetch,
  };
}
