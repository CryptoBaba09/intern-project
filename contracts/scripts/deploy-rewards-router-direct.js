// Bypasses Hardhat's own `hardhat run` task orchestration entirely --
// see deploy-direct.js for why (this project's iCloud-synced working
// directory hangs Hardhat's own test/run tasks; root-caused and fixed
// by running from a plain, non-iCloud path instead -- see the
// InternLoyaltyRewards commit). Deploys InternRewardsRouter with plain
// ethers.js against the already-compiled artifact, no Hardhat runtime
// needed.
//
// Usage (every address below defaults to the real, verified Robinhood
// Chain deployment -- override only if you have a specific reason to):
//   OWNER_ADDRESS=0x... node scripts/deploy-rewards-router-direct.js
// Reads PRIVATE_KEY from contracts/.env (same as every other
// deploy-*-direct.js script in this folder).
//
// STOP AND READ FIRST: this contract has been unit-tested (47/47
// passing across the full suite, verified 2026-09-16) but has NOT had
// a professional security audit, exactly as its own NatSpec says. It
// will move real BE and real Robinhood Stock Tokens through real,
// live third-party AMM pools once deployed and wired to the frontend.
// Deploying it is not the same as deciding it's safe to point real
// staker value at -- that's a separate, deliberate decision this
// script does not make for you.
require("dotenv").config();
const { ethers } = require("ethers");
const artifact = require("../artifacts/contracts/InternRewardsRouter.sol/InternRewardsRouter.json");

const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

// Real, deployed Robinhood Chain addresses -- confirmed against live
// chain state on 2026-09-16 (docs.robinhood.com/chain/contracts +
// GeckoTerminal liquidity checks), not guessed. See
// docs/rewards-router-spec.md for the full liquidity table.
const DEFAULT_BE_TOKEN = "0x822CC93fFD030293E9842c30BBD678F530701867";
const DEFAULT_USDG_TOKEN = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
// Same SwapRouter02 deployment intern-burn-bot/lib/swapEthForBe.js
// already calls in production for the bot's own BE purchases.
const DEFAULT_SWAP_ROUTER = "0xCaf681a66D020601342297493863E78C959E5cb2";
const DEFAULT_BE_USDG_FEE = 3000; // 0.30%, the real live BE/USDG pool's fee tier

// Printed after deploy as the exact setTargetAsset() calls needed to
// turn on TSLA/NVDA/SPCX -- not called automatically, so a fresh
// deployment starts with zero target assets until you deliberately
// enable each one.
const SUGGESTED_TARGETS = [
  { symbol: "TSLA", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", fee: 3000 },
  { symbol: "NVDA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", fee: 500 },
  { symbol: "SPCX", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", fee: 500 },
];

async function main() {
  const beTokenAddress = process.env.BE_TOKEN_ADDRESS || DEFAULT_BE_TOKEN;
  const usdgTokenAddress = process.env.USDG_TOKEN_ADDRESS || DEFAULT_USDG_TOKEN;
  const swapRouterAddress = process.env.SWAP_ROUTER_ADDRESS || DEFAULT_SWAP_ROUTER;
  const beUsdgFee = process.env.BE_USDG_FEE || DEFAULT_BE_USDG_FEE;
  const ownerAddress = process.env.OWNER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  for (const [name, value] of Object.entries({ OWNER_ADDRESS: ownerAddress, PRIVATE_KEY: privateKey })) {
    if (!value) throw new Error(`Missing required env var: ${name}`);
  }

  console.log("Connecting to Robinhood Chain...");
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: ethers.Network.from(4663),
  });
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Deploying from: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

  console.log("\nDeploying InternRewardsRouter with:");
  console.log(`  BE token:      ${beTokenAddress}`);
  console.log(`  USDG token:    ${usdgTokenAddress}`);
  console.log(`  swap router:   ${swapRouterAddress}`);
  console.log(`  BE/USDG fee:   ${beUsdgFee} (${beUsdgFee / 10000}%)`);
  console.log(`  owner:         ${ownerAddress}`);

  console.log(
    "\n*** This contract has NOT had a professional security audit. ***\n" +
      "Deploying is reversible (nothing points real value at it yet). Wiring the\n" +
      "frontend's convert() flow to a live address, and enabling target assets below,\n" +
      "is the actual point of no return -- do that only once you've made that call.\n"
  );

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(beTokenAddress, usdgTokenAddress, swapRouterAddress, beUsdgFee, ownerAddress);
  console.log(`Deploy tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nInternRewardsRouter deployed to: ${address}`);
  console.log(`\nNo target assets are enabled yet. To turn on TSLA/NVDA/SPCX, call setTargetAsset()`);
  console.log(`from the owner wallet (${ownerAddress}) for each:`);
  for (const t of SUGGESTED_TARGETS) {
    console.log(`  setTargetAsset(${t.address}, ${t.fee}) // ${t.symbol}`);
  }
  console.log(`\nThen add NEXT_PUBLIC_REWARDS_ROUTER_ADDRESS=${address} to Vercel's env vars`);
  console.log(`once you're ready to wire the real frontend flow -- see docs/rewards-router-spec.md.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exit(1);
  });
