const { ethers } = require("ethers");

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

// PLACEHOLDER ABI — replace with PAIR's actual router/Uniswap v4 swap
// router interface once available. This models a standard Uniswap-style
// exact-input single swap; PAIR's own router may differ (e.g. use the v4
// PoolManager + a periphery router with a different call shape).
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
];

/**
 * Swaps `beAmount` of BE for $INTERN on the live pool, buying on the open
 * market — this is what creates real buy pressure, not just an internal
 * bookkeeping burn. Returns the amount of $INTERN received.
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

  const beToken = new ethers.Contract(config.beTokenAddress, ERC20_ABI, wallet);
  const router = new ethers.Contract(config.routerAddress, ROUTER_ABI, wallet);

  const allowance = await beToken.allowance(wallet.address, config.routerAddress);
  if (allowance < beAmount) {
    console.log("[swap] Approving router to spend BE...");
    if (!dryRun) {
      const approveTx = await beToken.approve(config.routerAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log(`[swap] Approval confirmed: ${approveTx.hash}`);
    } else {
      console.log("[swap] DRY_RUN — skipping approval transaction.");
    }
  }

  // A real implementation should quote the expected output first (via the
  // pool's quoter contract) and apply config.maxSlippagePercent to compute
  // amountOutMinimum. Hardcoding 0 here is UNSAFE for production — this is
  // a placeholder until we wire up a real quote source for the BE/INTERN pool.
  const amountOutMinimum = 0n; // TODO: replace with a real slippage-protected quote

  const params = {
    tokenIn: config.beTokenAddress,
    tokenOut: config.internTokenAddress,
    fee: 3000, // 0.3% — confirm actual pool fee tier once live
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 5,
    amountIn: beAmount,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n,
  };

  console.log(
    `[swap] Buying $INTERN with ${ethers.formatEther(beAmount)} BE...`
  );

  if (dryRun) {
    console.log("[swap] DRY_RUN — skipping actual swap transaction.");
    return 0n;
  }

  const tx = await router.exactInputSingle(params);
  console.log(`[swap] Swap tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[swap] Swap confirmed in block ${receipt.blockNumber}`);

  const internToken = new ethers.Contract(
    config.internTokenAddress,
    ERC20_ABI,
    wallet
  );
  const balance = await internToken.balanceOf(wallet.address);
  return balance;
}

module.exports = { swapBeForIntern };
