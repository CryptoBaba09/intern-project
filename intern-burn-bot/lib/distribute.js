const { ethers } = require("ethers");

const DISTRIBUTOR_ABI = [
  "function totalStaked() view returns (uint256)",
  "function notifyRewardAmount(uint256 amount)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

/**
 * Splits claimed ETH per config.{burn,distribution,treasury}Percent --
 * EXCEPT the distribution cut folds into burn instead of sitting idle
 * whenever nobody is staked yet (confirmed by the user as the intended
 * policy: money owed to stakers-that-don't-exist shouldn't wait around
 * doing nothing, it should keep burning until stakers show up). Checked
 * fresh every cycle via distributor.totalStaked() -- if stakers appear
 * later, later cycles automatically go back to the normal three-way
 * split without any config change.
 *
 * Returns { burnEth, distributionEth, treasuryEth, distributeToStakers }
 * rather than performing every transfer itself, same separation-of-
 * concerns v1's computeSplit had.
 */
async function computeSplit({ config, totalEth, distributor }) {
  let totalStaked = 0n;
  let distributeToStakers = false;

  if (config.distributorAddress) {
    try {
      totalStaked = await distributor.totalStaked();
      distributeToStakers = totalStaked > 0n;
    } catch (err) {
      console.warn(
        `[split] Couldn't read totalStaked() from ${config.distributorAddress} ` +
          `(${err.shortMessage || err.message}) -- treating as "no stakers" and folding ` +
          "distribution into burn rather than guessing."
      );
    }
  } else {
    console.log("[split] No distributor configured -- folding distribution into burn.");
  }

  const effectiveBurnPercent = distributeToStakers
    ? config.burnPercent
    : config.burnPercent + config.distributionPercent;
  const effectiveDistributionPercent = distributeToStakers ? config.distributionPercent : 0;

  const burnEth = (totalEth * BigInt(effectiveBurnPercent)) / 100n;
  const distributionEth = (totalEth * BigInt(effectiveDistributionPercent)) / 100n;
  // Remainder absorbs integer-division dust so no wei silently disappears.
  const treasuryEth = totalEth - burnEth - distributionEth;

  console.log(
    `[split] ${ethers.formatEther(totalEth)} ETH to split ` +
      `(${distributeToStakers ? `${ethers.formatEther(totalStaked)} $INTERN staked` : "nobody staked"}) -> ` +
      `burn ${ethers.formatEther(burnEth)} (${effectiveBurnPercent}%), ` +
      `distribution ${ethers.formatEther(distributionEth)} (${effectiveDistributionPercent}%), ` +
      `treasury ${ethers.formatEther(treasuryEth)} (${config.treasuryPercent}%)`
  );

  return { burnEth, distributionEth, treasuryEth, distributeToStakers };
}

/**
 * Sends the treasury cut (plain ETH, no swap needed) and, only when
 * stakers actually exist, converts the distribution cut to BE and
 * deposits it into the distributor.
 *
 * LOAD-BEARING GAP: there is no verified on-chain route from ETH to BE
 * through Pons -- BE is not itself a Pons v2 launch (confirmed:
 * factory.getLaunchedToken(BE) returns exists=false), so this bot
 * cannot safely execute that swap without either (a) a confirmed BE
 * liquidity venue elsewhere on Robinhood Chain, or (b) accepting a
 * price it can't verify. Rather than guess a swap route with real
 * money, this throws a clear, actionable error if that path is ever
 * actually reached (distributionEth > 0). Today it never is --
 * totalStaked() reads 0 on the freshly-deployed v2 distributor, so
 * every real cycle right now takes the "fold into burn" path above and
 * never calls this function with a nonzero distributionEth. Revisit
 * once real staking activity makes this a live problem, not before.
 */
async function sendDistributionAndTreasury({ wallet, config, distributionEth, treasuryEth, dryRun }) {
  if (distributionEth > 0n) {
    throw new Error(
      `Need to convert ${ethers.formatEther(distributionEth)} ETH to BE for the staking ` +
        "distributor, but no verified ETH->BE route exists on Pons yet (BE isn't a Pons v2 " +
        "launch itself). Refusing to guess a swap route with real funds -- see the comment " +
        "on sendDistributionAndTreasury in distribute.js. This cycle's ENTIRE claim is left " +
        "untouched in the wallet (see index.js's carryover handling) rather than partially " +
        "processed, so nothing is lost or double-counted next run."
    );
  }

  await sendEth({ wallet, config, amount: treasuryEth, to: config.treasuryAddress, label: "treasury", dryRun });
}

async function sendEth({ wallet, config, amount, to, label, dryRun }) {
  if (amount === 0n) {
    console.log(`[split] Nothing to send to ${label} this run.`);
    return;
  }
  if (!to) {
    throw new Error(`No ${label} address configured, but ${ethers.formatEther(amount)} ETH is owed to it.`);
  }

  console.log(`[split] Sending ${ethers.formatEther(amount)} ETH to ${label} (${to})...`);
  if (dryRun) {
    console.log(`[split] DRY_RUN — skipping actual transfer to ${label}.`);
    return;
  }

  const tx = await wallet.sendTransaction({ to, value: amount });
  console.log(`[split] Transfer to ${label} sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[split] Transfer to ${label} confirmed in block ${receipt.blockNumber}`);
}

// Kept separate from sendDistributionAndTreasury (unreachable today, see
// its comment) so the day a real BE route exists, wiring it in is a
// matter of implementing swapEthForBe and calling this, not redesigning
// the split logic.
async function notifyDistributor({ wallet, config, beAmount, dryRun }) {
  if (beAmount === 0n) {
    console.log("[split] Nothing to send to the staking distributor this run.");
    return;
  }

  console.log(
    `[split] Depositing ${ethers.formatEther(beAmount)} BE into the staking distributor ` +
      `(${config.distributorAddress})...`
  );
  if (dryRun) {
    console.log("[split] DRY_RUN — skipping distributor deposit + notify.");
    return;
  }

  const beToken = new ethers.Contract(config.beTokenAddress, ERC20_ABI, wallet);
  const distributor = new ethers.Contract(config.distributorAddress, DISTRIBUTOR_ABI, wallet);

  const allowance = await beToken.allowance(wallet.address, config.distributorAddress);
  if (allowance < beAmount) {
    console.log("[split] Approving distributor to pull BE...");
    const approveTx = await beToken.approve(config.distributorAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log(`[split] Approval confirmed: ${approveTx.hash}`);
  }

  const tx = await distributor.notifyRewardAmount(beAmount);
  console.log(`[split] notifyRewardAmount sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[split] notifyRewardAmount confirmed in block ${receipt.blockNumber}`);
}

module.exports = { computeSplit, sendDistributionAndTreasury, notifyDistributor, DISTRIBUTOR_ABI };
