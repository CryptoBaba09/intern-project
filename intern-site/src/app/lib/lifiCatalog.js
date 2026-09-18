"use client";

// Live chain/token catalog for $interndex's any-to-any pickers --
// confirmed live 2026-09-19: LI.FI's own /v1/chains lists 70 real EVM
// chains (Robinhood Chain included), and /v1/tokens?chains=4663 alone
// returns 328 real tokens, 5823 on Ethereum. That's the actual "swap
// anything to anything" surface -- not something to hand-curate into a
// handful of arrays. Selection everywhere downstream is by ADDRESS, not
// symbol: a token list this size has real symbol collisions (multiple
// unrelated "USDC"-named tokens showing up is expected, same reason
// $INTERN's own ticker collides with unrelated coins elsewhere), and
// picking the wrong same-named token would move real money to the
// wrong contract.
//
// Module-level caches (not per-hook-instance state) -- the chain list
// and any given chain's token list are the same for every user in a
// session, so there's no reason to refetch them every time a widget
// mounts.
const chainsCache = { promise: null };
const tokensCache = new Map();

export async function fetchLifiChains() {
  if (!chainsCache.promise) {
    chainsCache.promise = fetch("https://li.quest/v1/chains")
      .then((res) => res.json())
      .then((data) =>
        (data.chains || [])
          .filter((c) => c.chainType === "EVM")
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      .catch((err) => {
        chainsCache.promise = null; // let a later call retry instead of caching a failure
        throw err;
      });
  }
  return chainsCache.promise;
}

export async function fetchLifiTokens(chainId) {
  if (!tokensCache.has(chainId)) {
    tokensCache.set(
      chainId,
      fetch(`https://li.quest/v1/tokens?chains=${chainId}`)
        .then((res) => res.json())
        .then((data) => data.tokens?.[String(chainId)] || [])
        .catch((err) => {
          tokensCache.delete(chainId);
          throw err;
        })
    );
  }
  return tokensCache.get(chainId);
}
