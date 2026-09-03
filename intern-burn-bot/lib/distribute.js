const { ethers } = require("ethers");

const ERC20_ABI = ["function transfer(address to, uint256 amount) external returns (bool)"];

/**
 * Splits a claimed BE amount three ways per config.{burn,distribution,treasury}Percent
 * and sends the treasury + distribution cuts as plain BE transfers. Returns the
 * burn-bucket amount so the caller can run it through the existing swap+burn flow —
 * this file never touches $INTERN, only BE.
 *
 * Important: the "distribution" cut is NOT yet paid out to individual $INTERN
 * holders — it just accumulates in config.distributionPoolAddress. Enumerating
 * every holder's balance and paying them pro-rata (the theindex.finance model)
 * needs either a token-holder indexer or an on-chain claim contract — a separate,
 * later piece of work from this bot. Treat this pool as "money correctly set
 * aside for holders," not "money already paid out to holders."
 */
async function splitFees({ wallet, config, totalBe, dryRun }) {
  const burnBe = (totalBe * BigInt(config.burnPercent)) / 100n;
  const distributionBe = (totalBe * BigInt(config.distributionPercent)) / 100n;
  // Remainder (not totalBe * treasuryPercent / 100n) absorbs integer-division
  // dust so no wei of the claim silently disappears.
  const treasuryBe = totalBe - burnBe - distributionBe;

  console.log(
    `[split] ${ethers.formatEther(totalBe)} BE claimed -> ` +
      `burn ${ethers.formatEther(burnBe)} (${config.burnPercent}%), ` +
      `distribution ${ethers.formatEther(distributionBe)} (${config.distributionPercent}%), ` +
      `treasury ${ethers.formatEther(treasuryBe)} (${config.treasuryPercent}%)`
  );

  await sendBe({
    wallet,
    config,
    amount: distributionBe,
    to: config.distributionPoolAddress,
    label: "distribution pool",
    dryRun,
  });

  await sendBe({
    wallet,
    config,
    amount: treasuryBe,
    to: config.treasuryAddress,
    label: "treasury",
    dryRun,
  });

  return burnBe;
}

async function sendBe({ wallet, config, amount, to, label, dryRun }) {
  if (amount === 0n) {
    console.log(`[split] Nothing to send to ${label} this run.`);
    return;
  }

  console.log(`[split] Sending ${ethers.formatEther(amount)} BE to ${label} (${to})...`);

  if (dryRun) {
    console.log(`[split] DRY_RUN — skipping actual transfer to ${label}.`);
    return;
  }

  const beToken = new ethers.Contract(config.beTokenAddress, ERC20_ABI, wallet);
  const tx = await beToken.transfer(to, amount);
  console.log(`[split] Transfer to ${label} sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[split] Transfer to ${label} confirmed in block ${receipt.blockNumber}`);
}

module.exports = { splitFees };
