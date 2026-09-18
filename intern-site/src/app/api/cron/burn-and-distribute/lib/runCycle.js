// Ported from intern-burn-bot/index.js's runCycle -- identical logic,
// just takes `config` as an explicit parameter instead of closing over
// a module-level singleton (this route's config.js is a lazy factory,
// not an eager one -- see its own comment; a top-level `getConfig()`
// call here would throw at import/build time the same way the
// pre-fix lib/mongodb.js did if BOT_PRIVATE_KEY isn't set yet).
const { ethers } = require("ethers");
const { claimFees } = require("./claimFees");
const { computeSplit, sendDistributionAndTreasury } = require("./distribute");
const { buyAndBurn } = require("./buyAndBurn");
const { burnIntern } = require("./burn");

const DISTRIBUTOR_READ_ABI = ["function totalStaked() view returns (uint256)"];
const ERC20_ABI = ["function balanceOf(address account) view returns (uint256)"];

async function runCycle(wallet, config) {
  console.log(`\n=== $INTERN burn bot run (Pons v2, via Vercel Cron): ${new Date().toISOString()} ===`);

  // In steady state the bot wallet holds ~0 $INTERN between cycles -- a
  // nonzero balance here means a PREVIOUS cycle bought $INTERN and then
  // failed before burning it. Always safe to fold into this cycle's
  // burn, same reasoning as the standalone bot's carryover handling.
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
    return { ethClaimed: 0n, internBurned: 0n, beDistributed: 0n };
  }

  let internToBurn = internCarryover;
  let beDistributed = 0n;

  if (ethClaimed > 0n) {
    const distributor = config.distributorAddress
      ? new ethers.Contract(config.distributorAddress, DISTRIBUTOR_READ_ABI, wallet)
      : null;
    const { burnEth, distributionEth, treasuryEth } = await computeSplit({
      config,
      totalEth: ethClaimed,
      distributor,
    });

    // Distribution+treasury are sent BEFORE the burn buy -- if this
    // throws, the cycle aborts here with ethClaimed's entire unsplit
    // amount left untouched in the wallet, never partially spent on a
    // buy that only covered part of the intended burn share.
    const { beDistributed: beSentThisCycle } = await sendDistributionAndTreasury({
      wallet,
      config,
      distributionEth,
      treasuryEth,
      dryRun: config.dryRun,
    });
    beDistributed = beSentThisCycle;

    const burnedTokens = await buyAndBurn({
      wallet,
      config,
      ethAmount: burnEth,
      dryRun: config.dryRun,
    });
    internToBurn += burnedTokens;
  }

  await burnIntern({ wallet, config, amount: internToBurn, dryRun: config.dryRun });

  console.log("=== Run complete ===\n");
  return { ethClaimed, internBurned: internToBurn, beDistributed };
}

module.exports = { runCycle };
