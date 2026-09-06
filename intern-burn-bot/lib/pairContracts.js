const { ethers } = require("ethers");

// URGENT FIX (found during pre-launch verification): PAIR's live launch flow
// as of today calls a DIFFERENT launch function than the "Legacy V5
// launchTokenMulti" this file originally assumed -- confirmed by pulling a
// real, just-launched token's actual transaction calldata and finding its
// 4-byte selector does not match launchTokenMulti's. More importantly,
// on-chain getLaunchPool(token, 0) now REVERTS ("out-of-bounds array
// access") for that real token: the newer launch path does not populate
// the same _launchPools mapping this file used to read from. Reading pool
// info on-chain here would silently break the bot's very first call, every
// cycle, forever.
//
// PAIR's own public API (https://pair.fund/docs, "Tokens" section) already
// exposes exactly the same data -- poolId, position token id, pool fee,
// tick spacing, hook address, quote token -- and is what PAIR's own
// frontend uses, so it reflects however the launch actually works today,
// without us needing to reverse-engineer their current internal launch
// calldata shape. Kept as a plain HTTPS read (Node 18+ has global fetch),
// same return shape as before so claimFees.js/swap.js need no changes.
const PAIR_API_BASE = "https://pair.fund/api";

/**
 * Resolves everything needed to read or swap against $INTERN's PAIR pool.
 * $INTERN is only ever paired against one market (BE), so this always uses
 * pairs[0] -- a multi-pair project would need one call per pair.
 */
async function getPoolInfo({ config }) {
  const url = `${PAIR_API_BASE}/tokens/${config.internTokenAddress}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `[pairContracts] PAIR API returned ${res.status} for ${url} -- ` +
        "can't resolve pool info without it."
    );
  }
  const token = await res.json();

  if (!token.pairs || token.pairs.length === 0) {
    throw new Error(
      `[pairContracts] PAIR API returned no pairs for ${config.internTokenAddress} -- ` +
        "has $INTERN actually launched yet?"
    );
  }

  const pair = token.pairs[0];
  const quoteToken = pair.quoteToken.address;

  if (quoteToken.toLowerCase() !== config.beTokenAddress.toLowerCase()) {
    console.warn(
      `[pairContracts] WARNING: PAIR reports this pool's quote token as ` +
        `${quoteToken}, which does not match configured BE_TOKEN_ADDRESS ` +
        `(${config.beTokenAddress}). Using PAIR's own value below is safe, ` +
        "but double-check BE_TOKEN_ADDRESS is right."
    );
  }

  // Uniswap V4 pools are keyed with currency0 < currency1 by address.
  const [currency0, currency1] =
    config.internTokenAddress.toLowerCase() < quoteToken.toLowerCase()
      ? [config.internTokenAddress, quoteToken]
      : [quoteToken, config.internTokenAddress];

  const poolKey = {
    currency0,
    currency1,
    fee: pair.poolFee,
    tickSpacing: pair.tickSpacing,
    hooks: pair.hookAddress,
  };

  return {
    positionId: BigInt(pair.positionTokenId ?? pair.positionId),
    quoteToken,
    poolKey,
  };
}

module.exports = { getPoolInfo };
