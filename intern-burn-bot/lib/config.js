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

  // Only INTERN_TOKEN_ADDRESS is genuinely unknowable before launch — it's
  // created when $INTERN deploys. Everything else below is real, stable
  // PAIR protocol infrastructure on Robinhood Chain (verified against
  // https://pair.fund/docs and each contract's source on Blockscout), so
  // it ships with real defaults and only needs overriding if PAIR upgrades
  // to a new version. The bot still checks all of these before running for
  // real (see index.js) — it will never silently operate on a blank address.
  internTokenAddress: process.env.INTERN_TOKEN_ADDRESS || "",
  // BE (Bloom Energy) is already a live, established PAIR quote asset used
  // by 80+ other launches — its address doesn't depend on $INTERN's own
  // launch at all.
  beTokenAddress: process.env.BE_TOKEN_ADDRESS || "0x822cC93fFD030293E9842C30bBD678f530701867",
  // PairV4Locker — holds every launch's locked position and creator/
  // protocol claimable balances. One contract for the whole protocol, not
  // per-token.
  feeClaimContractAddress:
    process.env.FEE_CLAIM_CONTRACT_ADDRESS || "0xeFcF476E8870fB3eb8680f039414fdcCE6C2a117",
  // PairV5MultiPoolAggregator — PAIR's own integrator-facing swap contract
  // (buyExactInput/sellExactInput). Deliberately NOT the raw Uniswap V4
  // Universal Router: PAIR's docs warn the Robinhood-deployed router uses a
  // non-standard struct field, and the aggregator exists specifically so
  // integrators don't have to hand-encode that.
  routerAddress: process.env.ROUTER_ADDRESS || "0x9d7741776098aFA315e4D576ede4F2c67a21d8Ce",
  // PairLaunchpadV5Upgradeable (proxy) — used to read $INTERN's pool info
  // (position id, fee tier, tick spacing, hook) at runtime rather than
  // hardcoding it. See lib/pairContracts.js.
  launchpadAddress: process.env.LAUNCHPAD_ADDRESS || "0x8660A7F019C7943b0b0A91B8E39AFf3b6DB6Ae62",
  // V4Quoter — used to get a real pre-trade price quote for slippage
  // protection instead of a hardcoded amountOutMinimum.
  quoterAddress: process.env.QUOTER_ADDRESS || "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94",
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
      config.launchpadAddress &&
      config.quoterAddress &&
      config.treasuryAddress &&
      config.distributorAddress
  );
}

module.exports = { config, isLiveConfigured };
