const { ethers } = require("ethers");
const { resolveLaunch, getCurve } = require("./ponsContracts");

// Replaces v1's swap.js. v1 claimed fees natively in BE and had to swap
// BE -> $INTERN on PAIR's aggregator before burning. v2's curve is
// native-ETH, so the equivalent step is buying $INTERN directly off the
// curve with the claimed ETH via buy() -- no separate router/aggregator
// contract exists or is needed pre-graduation.
//
// Quote math matches docs.ponsfamily.com/v2's "Getting a quote" section
// exactly (constant-product, fees taken off the input before pricing) --
// verified against this exact curve's live getReserves()/feeBps() on
// 2026-09-11, not guessed.
const BPS = 10_000n;

function amountOut(inAmount, reserveIn, reserveOut) {
  return (inAmount * reserveOut) / (reserveIn + inAmount);
}

/**
 * Buys $INTERN with `ethAmount` off the curve, then immediately sends
 * every token received to the dead address. Returns the amount burned.
 * Skips (returns 0n) below config.minEthToBuy -- a buy that small isn't
 * worth the gas, and the ETH stays in the wallet to accumulate for next
 * cycle rather than being spent on a dust-sized trade.
 */
async function buyAndBurn({ wallet, config, ethAmount, dryRun }) {
  if (ethAmount < ethers.parseEther(String(config.minEthToBuy))) {
    console.log(
      `[buyAndBurn] ${ethers.formatEther(ethAmount)} ETH is below the ` +
        `${config.minEthToBuy} ETH minimum to buy -- carrying it over for next cycle.`
    );
    return 0n;
  }

  const launch = await resolveLaunch({ provider: wallet.provider, config });
  const curve = getCurve({ address: launch.curve, signerOrProvider: wallet });

  const [reserves, feeBps, creatorTaxBps, sellable] = await Promise.all([
    curve.getReserves(),
    curve.feeBps(),
    curve.creatorTaxBps(),
    curve.sellableTokens(),
  ]);
  const [quoteReserve, tokenReserve] = reserves;

  // This bot's own wallet is exempted from the opening snipe tax (the
  // launching/creator-adjacent wallets always are, per Pons's docs), and
  // the launch is long past its opening seconds regardless -- so snipe
  // tax is deliberately not modeled here. If this code is ever reused
  // for a launch still in its first few seconds, that assumption breaks.
  const fee = (ethAmount * feeBps) / BPS;
  const tax = (ethAmount * creatorTaxBps) / BPS;
  let tokensOut = amountOut(ethAmount - fee - tax, quoteReserve, tokenReserve);

  if (tokensOut > sellable) {
    console.log(
      `[buyAndBurn] Quoted ${ethers.formatEther(tokensOut)} $INTERN exceeds the ` +
        `${ethers.formatEther(sellable)} still sellable on the curve -- clamping. ` +
        "The curve itself refunds the difference in ETH; this bot does not pre-compute " +
        "the repriced spend, it just accepts whatever the clamped fill actually costs."
    );
    tokensOut = sellable;
  }

  const minTokensOut =
    (tokensOut * BigInt(Math.round((100 - config.maxSlippagePercent) * 100))) / 10000n;

  console.log(
    `[buyAndBurn] Buying ~${ethers.formatEther(tokensOut)} $INTERN with ` +
      `${ethers.formatEther(ethAmount)} ETH (min ${ethers.formatEther(minTokensOut)}, ` +
      `${config.maxSlippagePercent}% slippage tolerance)...`
  );

  if (dryRun) {
    console.log("[buyAndBurn] DRY_RUN — skipping buy + burn transactions.");
    return tokensOut;
  }

  const buyTx = await curve.buy(ethAmount, minTokensOut, wallet.address, { value: ethAmount });
  console.log(`[buyAndBurn] buy tx sent: ${buyTx.hash}`);
  const receipt = await buyTx.wait();
  console.log(`[buyAndBurn] buy confirmed in block ${receipt.blockNumber}`);

  // Measure the real amount received rather than trusting the quote --
  // a buy near the curve's reserved allocation can be clamped and
  // partially refunded (see the CurveBuyRefunded note in Pons's docs).
  const internToken = new ethers.Contract(
    config.internTokenAddress,
    ["function balanceOf(address account) view returns (uint256)"],
    wallet
  );
  const actualBalance = await internToken.balanceOf(wallet.address);

  return actualBalance;
}

module.exports = { buyAndBurn };
