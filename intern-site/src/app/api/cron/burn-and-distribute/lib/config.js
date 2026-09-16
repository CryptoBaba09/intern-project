// Ported from intern-burn-bot/lib/config.js to run as a Vercel Cron
// route instead of a standalone node-cron process -- see this route's
// own top comment for why. No dotenv here: Next.js already loads
// .env.local in dev and real Vercel env vars in production, unlike the
// standalone bot which needed dotenv.config() itself.
//
// Server-only. Every var this reads is intentionally NOT prefixed
// NEXT_PUBLIC_ -- it must never be reachable from the browser bundle.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getConfig() {
  const config = {
    rpcUrl: process.env.CRON_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
    privateKey: required("BOT_PRIVATE_KEY"),

    // Same real, verified Pons v2 / Robinhood Chain addresses the
    // standalone bot used -- see intern-burn-bot/lib/config.js for the
    // verification history behind each default.
    internTokenAddress:
      process.env.INTERN_TOKEN_ADDRESS || "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8",
    beTokenAddress: process.env.BE_TOKEN_ADDRESS || "0x822CC93fFD030293E9842c30BBD678F530701867",
    factoryAddress: process.env.PONS_FACTORY_ADDRESS || "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
    feeEscrowAddress:
      process.env.PONS_FEE_ESCROW_ADDRESS || "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",
    treasuryAddress:
      process.env.TREASURY_ADDRESS || "0xBF2670493E35A015505dC5DdA82dF2Ff8D4FCEFC",
    distributorAddress:
      process.env.DISTRIBUTOR_ADDRESS || "0xd73a24D7bd311E36151344E233a7e6C73369E558",

    deadAddress: process.env.DEAD_ADDRESS || "0x000000000000000000000000000000000000dEaD",
    maxSlippagePercent: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || "5"),
    minEthToBuy: parseFloat(process.env.MIN_ETH_TO_BUY || "0.0005"),
    // DRY_RUN defaults true here too -- same fail-safe default as the
    // standalone bot. Must be explicitly set to "false" in Vercel's env
    // vars before this route ever sends a real transaction.
    dryRun: (process.env.DRY_RUN || "true").toLowerCase() !== "false",

    burnPercent: parseInt(process.env.BURN_PERCENT || "70", 10),
    distributionPercent: parseInt(process.env.DISTRIBUTION_PERCENT || "20", 10),
    treasuryPercent: parseInt(process.env.TREASURY_PERCENT || "10", 10),
  };

  if (config.burnPercent + config.distributionPercent + config.treasuryPercent !== 100) {
    throw new Error(
      `BURN_PERCENT + DISTRIBUTION_PERCENT + TREASURY_PERCENT must sum to 100 ` +
        `(got ${config.burnPercent} + ${config.distributionPercent} + ${config.treasuryPercent})`
    );
  }

  return config;
}

module.exports = { getConfig };
