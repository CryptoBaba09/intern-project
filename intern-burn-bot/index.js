const { ethers } = require("ethers");
const cron = require("node-cron");
const { config, isLiveConfigured } = require("./lib/config");
const { claimFees } = require("./lib/claimFees");
const { computeSplit, sendDistributionAndTreasury } = require("./lib/distribute");
const { buyAndBurn } = require("./lib/buyAndBurn");
const { burnIntern } = require("./lib/burn");

const DISTRIBUTOR_READ_ABI = ["function totalStaked() view returns (uint256)"];
const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

async function runCycle(wallet) {
  console.log(`\n=== $INTERN burn bot run (Pons v2): ${new Date().toISOString()} ===`);

  try {
    // In steady state the bot wallet holds ~0 $INTERN between cycles --
    // a nonzero balance here means a PREVIOUS cycle bought $INTERN and
    // then failed before burning it. Always safe to fold into this
    // cycle's burn, same reasoning as v1's carryover handling.
    const internToken = config.internTokenAddress
      ? new ethers.Contract(config.internTokenAddress, ERC20_ABI, wallet)
      : null;
    const internCarryover = internToken ? await internToken.balanceOf(wallet.address) : 0n;
    if (internCarryover > 0n) {
      console.warn(
        `[runCycle] Found ${ethers.formatEther(internCarryover)} $INTERN left over from ` +
          "a previous cycle that didn't finish burning -- folding it into this run."
      );
    }

    const { ethClaimed } = await claimFees({ wallet, config, dryRun: config.dryRun });

    if (ethClaimed === 0n && internCarryover === 0n) {
      console.log("=== Run complete: nothing to do ===\n");
      return;
    }

    let internToBurn = internCarryover;

    if (ethClaimed > 0n) {
      const distributor = config.distributorAddress
        ? new ethers.Contract(config.distributorAddress, DISTRIBUTOR_READ_ABI, wallet)
        : null;
      const { burnEth, distributionEth, treasuryEth } = await computeSplit({
        config,
        totalEth: ethClaimed,
        distributor,
      });

      // Distribution+treasury are sent BEFORE the burn buy, same ordering
      // v1 used and for the same reason: if this throws (today, always
      // when distributionEth > 0 -- see distribute.js), the cycle aborts
      // here with ethClaimed's entire unsplit amount left untouched in
      // the wallet, never partially spent on a buy that only covered
      // part of the intended burn share.
      await sendDistributionAndTreasury({
        wallet,
        config,
        distributionEth,
        treasuryEth,
        dryRun: config.dryRun,
      });

      // Only once distribution+treasury have succeeded is it safe to
      // treat the wallet's live ETH claim proceeds as pure burn-bound
      // money -- mirrors v1's same reasoning for BE.
      const burnedTokens = await buyAndBurn({
        wallet,
        config,
        ethAmount: burnEth,
        dryRun: config.dryRun,
      });
      internToBurn += burnedTokens;
    }

    await burnIntern({
      wallet,
      config,
      amount: internToBurn,
      dryRun: config.dryRun,
    });

    console.log("=== Run complete ===\n");
  } catch (err) {
    // Deliberately don't crash the whole process on one bad run — log it
    // and try again next cycle. Any ETH/$INTERN already claimed/bought
    // this cycle is picked back up automatically next run (see the
    // carryover checks above and in claimFees.js/buyAndBurn.js).
    console.error("[runCycle] Error during this cycle:", err.message);
  }
}

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection] Caught, bot stays alive:", err.message || err);
});

async function main() {
  console.log("$INTERN burn bot starting up (Pons v2)...");
  console.log(`DRY_RUN: ${config.dryRun ? "ON (no real transactions)" : "OFF (LIVE)"}`);

  if (!isLiveConfigured()) {
    console.warn(
      "\n⚠️  Not fully configured yet. INTERN_TOKEN_ADDRESS, PONS_FACTORY_ADDRESS, and " +
        "PONS_FEE_ESCROW_ADDRESS already default to real, verified Pons v2 addresses, so " +
        "the only thing actually missing is likely TREASURY_ADDRESS.\n" +
        "The bot will keep retrying on schedule, but every cycle will fail fast until " +
        "that's filled in.\n"
    );
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  console.log(`Operating as wallet: ${wallet.address}`);
  console.log(
    "NOTE: if this wallet is not the launch's creatorFeeRecipient, fee claims will " +
      "detect real ETH sitting in escrow it cannot withdraw -- see claimFees.js's top comment."
  );

  await runCycle(wallet);

  const cronExpression = `*/${config.runIntervalMinutes} * * * *`;
  console.log(
    `Scheduling future runs every ${config.runIntervalMinutes} minute(s) (cron: "${cronExpression}")`
  );
  cron.schedule(cronExpression, () => runCycle(wallet));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error on startup:", err);
    process.exit(1);
  });
}

module.exports = { runCycle };
