const { ethers } = require("ethers");

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const DISTRIBUTOR_ABI = [
  "function notifyRewardAmount(uint256 amount) external",
];

/**
 * Splits a claimed BE amount three ways per config.{burn,distribution,treasury}Percent.
 * Returns the burn-bucket amount so the caller can run it through the existing
 * swap+burn flow — this file never touches $INTERN, only BE.
 *
 * - The treasury cut is a plain BE transfer to config.treasuryAddress.
 * - The distribution cut is deposited into the InternStakingRewards contract
 *   at config.distributorAddress via notifyRewardAmount(), which streams it
 *   to everyone currently staking $INTERN, pro-rata and time-weighted (see
 *   contracts/contracts/InternStakingRewards.sol). This bot only funds that
 *   contract — it never touches individual holders' payouts directly.
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

  await notifyDistributor({ wallet, config, amount: distributionBe, dryRun });
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

async function notifyDistributor({ wallet, config, amount, dryRun }) {
  if (amount === 0n) {
    console.log("[split] Nothing to send to the staking distributor this run.");
    return;
  }

  console.log(
    `[split] Depositing ${ethers.formatEther(amount)} BE into the staking distributor ` +
      `(${config.distributorAddress})...`
  );

  if (dryRun) {
    console.log("[split] DRY_RUN — skipping distributor deposit + notify.");
    return;
  }

  const beToken = new ethers.Contract(config.beTokenAddress, ERC20_ABI, wallet);
  const distributor = new ethers.Contract(
    config.distributorAddress,
    DISTRIBUTOR_ABI,
    wallet
  );

  const allowance = await beToken.allowance(wallet.address, config.distributorAddress);
  if (allowance < amount) {
    console.log("[split] Approving distributor to pull BE...");
    const approveTx = await beToken.approve(config.distributorAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log(`[split] Approval confirmed: ${approveTx.hash}`);
  }

  const tx = await distributor.notifyRewardAmount(amount);
  console.log(`[split] notifyRewardAmount sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[split] notifyRewardAmount confirmed in block ${receipt.blockNumber}`);
}

module.exports = { splitFees };
