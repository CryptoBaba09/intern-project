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

  // These four are empty until $INTERN is actually live on PAIR.
  // The bot checks for them and refuses to run for real until they're set
  // (see index.js) — it will never silently operate on placeholder addresses.
  internTokenAddress: process.env.INTERN_TOKEN_ADDRESS || "",
  beTokenAddress: process.env.BE_TOKEN_ADDRESS || "",
  feeClaimContractAddress: process.env.FEE_CLAIM_CONTRACT_ADDRESS || "",
  routerAddress: process.env.ROUTER_ADDRESS || "",

  deadAddress:
    process.env.DEAD_ADDRESS || "0x000000000000000000000000000000000000dEaD",
  minBeToSwap: parseFloat(process.env.MIN_BE_TO_SWAP || "0.05"),
  maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || "3"),
  runIntervalMinutes: parseInt(process.env.RUN_INTERVAL_MINUTES || "60", 10),
  dryRun: (process.env.DRY_RUN || "true").toLowerCase() !== "false",
};

function isLiveConfigured() {
  return Boolean(
    config.internTokenAddress &&
      config.beTokenAddress &&
      config.feeClaimContractAddress &&
      config.routerAddress
  );
}

module.exports = { config, isLiveConfigured };
