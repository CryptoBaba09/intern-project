const { ethers } = require("ethers");
const cron = require("node-cron");
const { config, isLiveConfigured } = require("./lib/config");
const { claimFees } = require("./lib/claimFees");
const { splitFees } = require("./lib/distribute");
const { swapBeForIntern } = require("./lib/swap");
const { burnIntern } = require("./lib/burn");

async function runCycle(wallet) {
  console.log(`\n=== $INTERN burn bot run: ${new Date().toISOString()} ===`);

  try {
    // Fees accrue in both assets a pool trades — BE and $INTERN itself —
    // as separate balances (see lib/claimFees.js). Only the BE side goes
    // through the 70/20/10 split and a swap; $INTERN fees are already the
    // thing we want to burn, so they skip straight to burnIntern below.
    const { beClaimed, internClaimed } = await claimFees({
      wallet,
      config,
      dryRun: config.dryRun,
    });

    if (beClaimed === 0n && internClaimed === 0n) {
      console.log("=== Run complete: nothing to do ===\n");
      return;
    }

    let internToBurn = internClaimed;

    if (beClaimed > 0n) {
      // Route the treasury and distribution-pool cuts (in BE, no swap) and
      // get back only the burn bucket's share to actually swap.
      const burnBe = await splitFees({
        wallet,
        config,
        totalBe: beClaimed,
        dryRun: config.dryRun,
      });

      const swappedIntern = await swapBeForIntern({
        wallet,
        config,
        beAmount: burnBe,
        dryRun: config.dryRun,
      });

      internToBurn += swappedIntern;
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
    // and try again next cycle. A single failed swap shouldn't take the
    // bot offline.
    console.error("[runCycle] Error during this cycle:", err.message);
  }
}

// Without this, a transient RPC error that surfaces outside our explicit
// try/catch (e.g. ethers' background network-detection call) would crash
// the whole process — and Railway would just keep restarting it in a loop.
// Log it and keep the scheduler alive instead.
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection] Caught, bot stays alive:", err.message || err);
});

async function main() {
  console.log("$INTERN burn bot starting up...");
  console.log(`DRY_RUN: ${config.dryRun ? "ON (no real transactions)" : "OFF (LIVE)"}`);

  if (!isLiveConfigured()) {
    console.warn(
      "\n⚠️  Not fully configured yet. BE_TOKEN_ADDRESS, FEE_CLAIM_CONTRACT_ADDRESS, " +
        "ROUTER_ADDRESS, LAUNCHPAD_ADDRESS, and QUOTER_ADDRESS already default to " +
        "real PAIR protocol addresses on Robinhood Chain, so the only things " +
        "actually missing are likely INTERN_TOKEN_ADDRESS (known once $INTERN " +
        "launches on PAIR) and/or DISTRIBUTOR_ADDRESS (known once " +
        "InternStakingRewards is deployed) and/or TREASURY_ADDRESS.\n" +
        "This is expected before $INTERN is live. The bot will keep retrying " +
        "on schedule, but every cycle will fail fast until those are filled in.\n"
    );
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  console.log(`Operating as wallet: ${wallet.address}`);

  // Run once immediately on startup, then on the configured schedule.
  await runCycle(wallet);

  const cronExpression = `*/${config.runIntervalMinutes} * * * *`;
  console.log(
    `Scheduling future runs every ${config.runIntervalMinutes} minute(s) (cron: "${cronExpression}")`
  );
  cron.schedule(cronExpression, () => runCycle(wallet));
}

main().catch((err) => {
  console.error("Fatal error on startup:", err);
  process.exit(1);
});
