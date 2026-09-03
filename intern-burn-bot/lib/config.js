require("dotenv").config();

function required(name, { onlyIfLive = false } = {}) {
  const value = process.env[name];
  if (!value && !onlyIfLive) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const config = {
  rpcUrl: required("RPC_URL"),
  privateKey: required("PRIVATE_KEY"),

  // These six are empty until $INTERN is actually live on PAIR.
  // The bot checks for them and refuses to run for real until they're set
  // (see index.js) — it will never silently operate on placeholder addresses.
  internTokenAddress: process.env.INTERN_TOKEN_ADDRESS || "",
  beTokenAddress: process.env.BE_TOKEN_ADDRESS || "",
  feeClaimContractAddress: process.env.FEE_CLAIM_CONTRACT_ADDRESS || "",
  routerAddress: process.env.ROUTER_ADDRESS || "",
  // Ops/marketing/expansion wallet — receives the treasury cut of every
  // claim, in BE, no swap involved.
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  // The deployed InternStakingRewards contract (see ../contracts). This
  // bot deposits the distribution cut here via notifyRewardAmount(), which
  // streams it to everyone staking $INTERN, pro-rata and time-weighted.
  distributorAddress: process.env.DISTRIBUTOR_ADDRESS || "",

  deadAddress:
    process.env.DEAD_ADDRESS || "0x000000000000000000000000000000000000dEaD",
  minBeToSwap: parseFloat(process.env.MIN_BE_TO_SWAP || "0.05"),
  maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || "3"),
  runIntervalMinutes: parseInt(process.env.RUN_INTERVAL_MINUTES || "60", 10),
  dryRun: (process.env.DRY_RUN || "true").toLowerCase() !== "false",

  // How every claimed BE fee gets split, in whole percent. Must sum to 100
  // (checked below). Burn keeps supply shrinking (the core mechanic);
  // distribution accrues toward future $INTERN-holder payouts; treasury
  // funds ops/marketing/expansion.
  burnPercent: parseInt(process.env.BURN_PERCENT || "70", 10),
  distributionPercent: parseInt(process.env.DISTRIBUTION_PERCENT || "20", 10),
  treasuryPercent: parseInt(process.env.TREASURY_PERCENT || "10", 10),
};

if (config.burnPercent + config.distributionPercent + config.treasuryPercent !== 100) {
  throw new Error(
    `BURN_PERCENT + DISTRIBUTION_PERCENT + TREASURY_PERCENT must sum to 100 ` +
      `(got ${config.burnPercent} + ${config.distributionPercent} + ${config.treasuryPercent} = ` +
      `${config.burnPercent + config.distributionPercent + config.treasuryPercent})`
  );
}

function isLiveConfigured() {
  return Boolean(
    config.internTokenAddress &&
      config.beTokenAddress &&
      config.feeClaimContractAddress &&
      config.routerAddress &&
      config.treasuryAddress &&
      config.distributorAddress
  );
}

module.exports = { config, isLiveConfigured };
