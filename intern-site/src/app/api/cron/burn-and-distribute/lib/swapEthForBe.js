const { ethers } = require("ethers");

// Real ETH -> BE swap route, verified against live chain state on
// 2026-09-11 (not guessed): a standard Uniswap V3 WETH/BE pool with
// real liquidity, at 0xe3ECA0Fa4A9Bd2C90852c94FE4A756dA11300489 (0.3%
// fee tier), reachable through a genuine SwapRouter02 deployment on
// Robinhood Chain. Confirmed via:
//   - pool.token0() = WETH (0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73),
//     pool.token1() = BE, pool.liquidity() > 0
//   - router.factory() and router.WETH9() both resolve to real,
//     matching addresses; router bytecode contains SwapRouter02's
//     exactInputSingle/multicall/refundETH selectors
// Deliberately independent of Pons and Pair.fund -- this is plain
// Uniswap V3 infrastructure, not tied to either platform, so it isn't
// affected by Pair.fund's breakage or anything Pons-specific.
const WETH_ADDRESS = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
const SWAP_ROUTER_ADDRESS = "0xCaf681a66D020601342297493863E78C959E5cb2";
const QUOTER_V2_ADDRESS = "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7";
const POOL_FEE = 3000; // 0.3%, confirmed via pool.fee()

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
];

/**
 * Swaps `ethAmount` of native ETH for BE through the verified WETH/BE
 * pool above, returning the amount of BE actually received (measured
 * via balance delta, not trusted from the quote -- same discipline as
 * every other real-money call in this bot). SwapRouter02 accepts native
 * ETH directly for a WETH-denominated leg (no separate wrap step
 * needed); it wraps internally when value is sent with the call.
 */
async function swapEthForBe({ wallet, config, ethAmount, dryRun }) {
  if (ethAmount === 0n) {
    console.log("[swapEthForBe] Nothing to swap this run.");
    return 0n;
  }

  const quoter = new ethers.Contract(QUOTER_V2_ADDRESS, QUOTER_ABI, wallet.provider);
  const { amountOut: quotedOut } = await quoter.quoteExactInputSingle.staticCall({
    tokenIn: WETH_ADDRESS,
    tokenOut: config.beTokenAddress,
    amountIn: ethAmount,
    fee: POOL_FEE,
    sqrtPriceLimitX96: 0n,
  });

  const minOut =
    (quotedOut * BigInt(Math.round((100 - config.maxSlippagePercent) * 100))) / 10000n;

  console.log(
    `[swapEthForBe] Quoted ${ethers.formatEther(quotedOut)} BE for ${ethers.formatEther(ethAmount)} ETH ` +
      `(min ${ethers.formatEther(minOut)}, ${config.maxSlippagePercent}% slippage tolerance)...`
  );

  if (dryRun) {
    console.log("[swapEthForBe] DRY_RUN — skipping actual swap transaction.");
    return quotedOut;
  }

  const beToken = new ethers.Contract(
    config.beTokenAddress,
    ["function balanceOf(address account) view returns (uint256)"],
    wallet
  );
  const balanceBefore = await beToken.balanceOf(wallet.address);

  const router = new ethers.Contract(SWAP_ROUTER_ADDRESS, ROUTER_ABI, wallet);
  const tx = await router.exactInputSingle(
    {
      tokenIn: WETH_ADDRESS,
      tokenOut: config.beTokenAddress,
      fee: POOL_FEE,
      recipient: wallet.address,
      amountIn: ethAmount,
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: 0n,
    },
    { value: ethAmount }
  );
  console.log(`[swapEthForBe] exactInputSingle tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[swapEthForBe] Swap confirmed in block ${receipt.blockNumber}`);

  const balanceAfter = await beToken.balanceOf(wallet.address);
  const actuallyReceived = balanceAfter - balanceBefore;
  console.log(
    `[swapEthForBe] Received ${ethers.formatEther(actuallyReceived)} BE ` +
      `(quoted ${ethers.formatEther(quotedOut)}).`
  );

  return actuallyReceived;
}

module.exports = { swapEthForBe };
