const { ethers } = require("ethers");

// Verified against PairLaunchpadV5Upgradeable's implementation ABI on
// Blockscout (0x1559f2beDa73C57aB7964Ed1A29d8c4d8370b12c) — see
// https://pair.fund/docs for the human-readable version of all of this.
const LAUNCHPAD_ABI = [
  "function getLaunchPool(address projectToken, uint256 index) view returns (tuple(address quoteToken, uint16 weightBps, bytes32 poolId, uint256 positionId, uint256 initialProjectTokenAmount, int24 tickLower, int24 tickUpper, uint256 quoteUsdAtLaunchE8, address quotePriceFeed, uint8 quoteDecimals))",
  "function POOL_FEE() view returns (uint24)",
  "function TICK_SPACING() view returns (int24)",
  "function pairHook() view returns (address)",
];

/**
 * Resolves everything needed to read or swap against $INTERN's PAIR pool,
 * live from the launchpad contract rather than hardcoded — the pool's
 * position id, fee tier, tick spacing, and hook address are all specific
 * to how $INTERN was actually launched, and PAIR exposes every one of them
 * as a public view, so there's nothing here to get wrong by copying it
 * into a config file by hand.
 *
 * $INTERN is only ever paired against one market (BE), so this always
 * reads pool index 0 — a multi-pair project would need one call per pool.
 */
async function getPoolInfo({ provider, config }) {
  const launchpad = new ethers.Contract(config.launchpadAddress, LAUNCHPAD_ABI, provider);

  const [pool, poolFee, tickSpacing, hooks] = await Promise.all([
    launchpad.getLaunchPool(config.internTokenAddress, 0),
    launchpad.POOL_FEE(),
    launchpad.TICK_SPACING(),
    launchpad.pairHook(),
  ]);

  if (pool.quoteToken.toLowerCase() !== config.beTokenAddress.toLowerCase()) {
    console.warn(
      `[pairContracts] WARNING: launchpad reports this pool's quote token as ` +
        `${pool.quoteToken}, which does not match configured BE_TOKEN_ADDRESS ` +
        `(${config.beTokenAddress}). Using the launchpad's own value below is ` +
        `safe, but double-check BE_TOKEN_ADDRESS is right.`
    );
  }

  // Uniswap V4 pools are keyed with currency0 < currency1 by address.
  const [currency0, currency1] =
    config.internTokenAddress.toLowerCase() < pool.quoteToken.toLowerCase()
      ? [config.internTokenAddress, pool.quoteToken]
      : [pool.quoteToken, config.internTokenAddress];

  const poolKey = { currency0, currency1, fee: poolFee, tickSpacing, hooks };

  return {
    positionId: pool.positionId,
    quoteToken: pool.quoteToken,
    poolKey,
  };
}

module.exports = { getPoolInfo, LAUNCHPAD_ABI };
