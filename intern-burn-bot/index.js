const { ethers } = require("ethers");
const cron = require("node-cron");
const { config, isLiveConfigured } = require("./lib/config");
const { claimFees } = require("./lib/claimFees");
const { computeSplit, sendDistributionAndTreasury } = require("./lib/distribute");
const { swapBeForIntern } = require("./lib/swap");
const { burnIntern } = require("./lib/burn");

const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

async function runCycle(wallet) {
  console.log(`\n=== $INTERN burn bot run: ${new Date().toISOString()} ===`);

  try {
    // In steady state the bot wallet holds ~0 $INTERN between cycles --
    // every run either burns whatever it has or throws before doing
    // anything with it. A nonzero balance here means a PREVIOUS cycle
    // claimed real $INTERN fees (or swapped BE into $INTERN) and then
    // failed before reaching burnIntern(). The wallet has no other
    // legitimate reason to hold $INTERN between cycles, so this is
    // always unambiguously safe to fold straight into this cycle's burn
    // -- unlike the BE side below, which needs more care.
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

    // Fees accrue in both assets a pool trades — BE and $INTERN itself —
    // as separate balances (see lib/claimFees.js). Only the BE side goes
    // through the 70/20/10 split and a swap; $INTERN fees are already the
    // thing we want to burn, so they skip straight to burnIntern below.
    const { beClaimed, internClaimed } = await claimFees({
      wallet,
      config,
      dryRun: config.dryRun,
    });

    let internToBurn = internCarryover + internClaimed;

    if (beClaimed === 0n && internToBurn === 0n) {
      console.log("=== Run complete: nothing to do ===\n");
      return;
    }

    if (beClaimed > 0n) {
      const { burnBe, distributionBe, treasuryBe } = computeSplit({ config, totalBe: beClaimed });

      // Distribution and treasury are sent first, for exactly this
      // cycle's claim only -- if this throws, the cycle aborts here and
      // beClaimed's entire unsplit amount (including its burnBe share)
      // is left in the wallet untouched. That's a real, NOT-auto-healed
      // gap: next cycle can't safely tell "money that failed to split"
      // apart from "dust the swap step legitimately left behind on
      // purpose" (see below), so re-deriving a fresh split from whatever
      // BE balance it finds would risk double-splitting already-earmarked
      // burn dust. This failure mode is narrower and rarer than the swap
      // reverting (a plain ERC20 transfer and a well-tested
      // notifyRewardAmount call are much less likely to revert than a
      // price-sensitive swap), so it's left as a "check the logs and
      // reconcile manually" case rather than adding persisted state to
      // close it automatically.
      await sendDistributionAndTreasury({
        wallet,
        config,
        distributionBe,
        treasuryBe,
        dryRun: config.dryRun,
      });

      // Only once distribution+treasury have actually succeeded above is
      // it safe to read the wallet's live BE balance and treat all of it
      // as pure burn-bound money. This is what makes swap.js's "below
      // threshold, will accumulate for next time" comment actually true:
      // any dust a PAST cycle's swap call skipped for being too small can
      // only have gotten there via this same successful-send path, so at
      // this exact point the wallet holds nothing but this cycle's fresh
      // burnBe plus that safely-accumulated dust -- never anything still
      // owed to distribution or treasury. (In DRY_RUN, nothing actually
      // moved, so fall back to the computed burnBe instead of a real
      // on-chain read.)
      const beToken = new ethers.Contract(config.beTokenAddress, ERC20_ABI, wallet);
      const pendingBurnBe = config.dryRun ? burnBe : await beToken.balanceOf(wallet.address);

      const swappedIntern = await swapBeForIntern({
        wallet,
        config,
        beAmount: pendingBurnBe,
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
    // bot offline. Any $INTERN already claimed/swapped this cycle is
    // picked back up automatically next run (see internCarryover above).
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

// Only auto-boot when run directly (`node index.js` / `npm start`) --
// not when required as a module, e.g. by test/runCycle.test.js, which
// needs runCycle without also starting the real wallet + cron loop.
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error on startup:", err);
    process.exit(1);
  });
}

module.exports = { runCycle };
