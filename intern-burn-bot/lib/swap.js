const { ethers } = require("ethers");
const { getPoolInfo } = require("./pairContracts");

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

// Verified against PairV5MultiPoolAggregator's ABI on Blockscout
// (0x9d7741776098aFA315e4D576ede4F2c67a21d8Ce) — see https://pair.fund/docs.
//
// This replaces an earlier placeholder that assumed a plain Uniswap-v3-style
// exactInputSingle router. PAIR's docs explicitly warn against that: the
// Robinhood-deployed Universal Router uses a non-standard V4 struct (an
// extra minHopPriceX36 field), so hand-rolling raw Universal Router calldata
// is a real way to get this wrong. PAIR instead publishes this aggregator
// specifically for integrators — a plain approve + function call, no V4
// action-encoding required on our end.
const AGGREGATOR_ABI = [
  "function buyExactInput(address projectToken, address fundingToken, address recipient, tuple(uint8 poolIndex, tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, uint128 amountIn, uint128 minAmountOut)[] legs, uint256 aggregateMinOut, uint256 deadline) external returns (uint256 amountOut)",
];

// Verified against V4Quoter's ABI on Blockscout
// (0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94). Note this is declared
// nonpayable, not view — Uniswap's V4 quoters intentionally revert
// internally to produce a gas-accurate quote, so this must be called via
// staticCall (a simulated call), never as a real transaction.
const QUOTER_ABI = [
  "function quoteExactInputSingle(tuple(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)",
];

/**
 * Swaps `beAmount` of BE for $INTERN on PAIR's live pool via PairV5MultiPoolAggregator
 * — this is what creates real buy pressure, not just an internal bookkeeping
 * burn. Slippage protection comes from a real pre-trade quote (V4Quoter),
 * not a hardcoded value. Returns the amount of $INTERN received.
 */
async function swapBeForIntern({ wallet, config, beAmount, dryRun }) {
  if (beAmount < ethers.parseEther(String(config.minBeToSwap))) {
    console.log(
      `[swap] ${ethers.formatEther(beAmount)} BE is below the ${
        config.minBeToSwap
      } BE threshold — skipping this run, will accumulate for next time.`
    );
    return 0n;
  }

  const { poolKey } = await getPoolInfo({ provider: wallet.provider, config });

  const beToken = new ethers.Contract(config.beTokenAddress, ERC20_ABI, wallet);
  const allowance = await beToken.allowance(wallet.address, config.routerAddress);
  if (allowance < beAmount) {
    console.log("[swap] Approving aggregator to spend BE...");
    if (!dryRun) {
      const approveTx = await beToken.approve(config.routerAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`[swap] Approval confirmed: ${approveTx.hash}`);
    } else {
      console.log("[swap] DRY_RUN — skipping approval transaction.");
    }
  }

  // Real slippage protection: quote the trade first, then apply
  // config.maxSlippagePercent to the quoted output. This replaces what was
  // previously a hardcoded amountOutMinimum = 0 (unsafe — that accepted
  // any output at all, including a sandwich-attacked one).
  const zeroForOne = config.beTokenAddress.toLowerCase() === poolKey.currency0.toLowerCase();
  const quoter = new ethers.Contract(config.quoterAddress, QUOTER_ABI, wallet.provider);
  const [quotedOut] = await quoter.quoteExactInputSingle.staticCall({
    poolKey,
    zeroForOne,
    exactAmount: beAmount,
    hookData: "0x",
  });

  const slippageBps = BigInt(Math.round(config.maxSlippagePercent * 100));
  const minAmountOut = (quotedOut * (10000n - slippageBps)) / 10000n;

  console.log(
    `[swap] Quoted ${ethers.formatEther(quotedOut)} $INTERN for ` +
      `${ethers.formatEther(beAmount)} BE — minimum accepted ` +
      `${ethers.formatEther(minAmountOut)} (${config.maxSlippagePercent}% slippage)`
  );

  if (dryRun) {
    console.log("[swap] DRY_RUN — skipping actual swap transaction.");
    return 0n;
  }

  const aggregator = new ethers.Contract(config.routerAddress, AGGREGATOR_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 5;
  const leg = { poolIndex: 0, poolKey, amountIn: beAmount, minAmountOut };

  const tx = await aggregator.buyExactInput(
    config.internTokenAddress,
    config.beTokenAddress,
    wallet.address,
    [leg],
    minAmountOut,
    deadline
  );
  console.log(`[swap] Swap tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[swap] Swap confirmed in block ${receipt.blockNumber}`);

  const internToken = new ethers.Contract(config.internTokenAddress, ERC20_ABI, wallet);
  return await internToken.balanceOf(wallet.address);
}

module.exports = { swapBeForIntern };
