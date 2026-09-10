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

  // v2 $INTERN, live on Pons, migrated off Pair.fund 2026-09-10. Unlike
  // v1's PAIR-specific infra, everything below except this address and
  // DISTRIBUTOR_ADDRESS/TREASURY_ADDRESS is real, stable Pons v2
  // protocol infrastructure (verified against docs.ponsfamily.com/v2
  // and live eth_call reads on 2026-09-11, not guessed), so it ships
  // with real defaults.
  internTokenAddress:
    process.env.INTERN_TOKEN_ADDRESS || "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8",
  // BE (Bloom Energy) -- the v1 staking-reward asset. NOT a Pons v2
  // launch itself (verified: factory.getLaunchedToken(BE) returns
  // exists=false), so there is no on-chain route from ETH to BE through
  // Pons. See distribute.js for what that means for the 20% bucket.
  beTokenAddress: process.env.BE_TOKEN_ADDRESS || "0x822CC93fFD030293E9842c30BBD678F530701867",
  // Pons v2 launch factory. Used only to resolve the curve address per
  // launch (see ponsContracts.js) -- never hardcode a curve address,
  // Pons's own docs say to resolve it instead.
  factoryAddress: process.env.PONS_FACTORY_ADDRESS || "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
  // Pons v2 fee escrow -- holds claimable creator/protocol balances
  // after a curve's sweepFees() runs. One contract for the whole
  // protocol, not per-token.
  feeEscrowAddress: process.env.PONS_FEE_ESCROW_ADDRESS || "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",
  // Ops/marketing/expansion wallet -- receives the treasury cut of
  // every claim, in plain ETH now (v1 paid this in BE; v2's fees accrue
  // in ETH since $INTERN v2 is a native-ETH launch).
  treasuryAddress: process.env.TREASURY_ADDRESS || "",
  // The deployed InternStakingRewards contract for v2 (see
  // ../contracts -- NOT the same address as v1's, which is tied to the
  // old token and should not be reused). Deployed 2026-09-11, verified
  // on-chain: stakingToken = v2 $INTERN, rewardToken = BE, owner = the
  // creator wallet. totalStaked() reads 0 right now -- nobody has
  // staked yet, so the distribution cut folds into the burn (see
  // distribute.js) until that changes.
  distributorAddress:
    process.env.DISTRIBUTOR_ADDRESS || "0xd73a24D7bd311E36151344E233a7e6C73369E558",

  deadAddress: process.env.DEAD_ADDRESS || "0x000000000000000000000000000000000000dEaD",
  // Slippage tolerance for the curve buy that turns claimed ETH into
  // $INTERN before burning -- see buyAndBurn.js. Same generosity
  // rationale v1's MAX_SLIPPAGE_PERCENT had: a brand-new, thin-liquidity
  // curve moves more per trade than an established pool, so a tight
  // tolerance just means constant failed simulations.
  maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || "5"),
  // Below this, a curve buy isn't worth the gas -- accumulates in the
  // wallet for next cycle instead (see buyAndBurn.js's carryover
  // handling in index.js).
  minEthToBuy: parseFloat(process.env.MIN_ETH_TO_BUY || "0.0005"),
  runIntervalMinutes: parseInt(process.env.RUN_INTERVAL_MINUTES || "60", 10),
  dryRun: (process.env.DRY_RUN || "true").toLowerCase() !== "false",

  // How every claimed ETH fee gets split, in whole percent. Must sum to
  // 100 (checked below). This is the BASE split when stakers exist;
  // when distributor.totalStaked() reads zero (or the distributor isn't
  // deployed yet), the distribution cut folds into the burn instead of
  // sitting idle with nowhere to go -- see distribute.js.
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
      config.factoryAddress &&
      config.feeEscrowAddress &&
      config.treasuryAddress
    // distributorAddress deliberately NOT required here -- its absence
    // is a normal, handled state (fold distribution into burn), not a
    // missing-config error. See distribute.js.
  );
}

module.exports = { config, isLiveConfigured };
