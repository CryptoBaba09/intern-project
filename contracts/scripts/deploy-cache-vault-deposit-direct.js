// Bypasses Hardhat's own `hardhat run` task orchestration entirely --
// see deploy-direct.js for why (this project's iCloud-synced working
// directory hangs Hardhat's own test/run tasks; root-caused and fixed
// by running from a plain, non-iCloud path instead). Deploys
// CacheVaultDeposit with plain ethers.js against the already-compiled
// artifact, no Hardhat runtime needed. Same shape as
// deploy-rewards-router-direct.js.
//
// Usage (every address below defaults to the real, verified Robinhood
// Chain deployment -- override only if you have a specific reason to):
//   OWNER_ADDRESS=0x... node scripts/deploy-cache-vault-deposit-direct.js
// Reads PRIVATE_KEY from contracts/.env (same as every other
// deploy-*-direct.js script in this folder).
//
// STOP AND READ FIRST: this contract has been unit-tested (19/19
// passing, verified 2026-09-23) and passed an in-house Slither +
// manual review pass (see docs/cache-intern-spec.md for exactly what
// that covered, including the minShares slippage-floor fix). It has
// NOT had an independent professional security audit. It will move
// real USDG and mint real Morpho vault shares once deployed and wired
// to the frontend. Deploying it is not the same as deciding it's safe
// to point real depositor value at -- that's a separate, deliberate
// decision this script does not make for you.
require("dotenv").config();
const { ethers } = require("ethers");
const artifact = require("../artifacts/contracts/CacheVaultDeposit.sol/CacheVaultDeposit.json");

const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

// Real, deployed Robinhood Chain addresses -- confirmed live on
// 2026-09-23 (see docs/cache-intern-spec.md: bytecode selector check +
// a live asset() read against the real vault), not guessed.
const DEFAULT_USDG_TOKEN = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const DEFAULT_VAULT = "0xBeEff033F34C046626B8D0A041844C5d1A5409dd"; // Steakhouse USDG, curated by Steakhouse Financial
const DEFAULT_FEE_BPS = 20; // 0.2%, same rate as $interndex, by choice for consistency

async function main() {
  const usdgTokenAddress = process.env.USDG_TOKEN_ADDRESS || DEFAULT_USDG_TOKEN;
  const vaultAddress = process.env.VAULT_ADDRESS || DEFAULT_VAULT;
  const feeBps = process.env.FEE_BPS || DEFAULT_FEE_BPS;
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || process.env.OWNER_ADDRESS;
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

  console.log("\nDeploying CacheVaultDeposit with:");
  console.log(`  USDG token:    ${usdgTokenAddress}`);
  console.log(`  vault:         ${vaultAddress} (Steakhouse USDG)`);
  console.log(`  fee bps:       ${feeBps} (${feeBps / 100}%)`);
  console.log(`  fee recipient: ${feeRecipient}`);
  console.log(`  owner:         ${ownerAddress}`);

  console.log(
    "\n*** This contract has NOT had an independent professional security audit. ***\n" +
      "Deploying is reversible (nothing points real value at it yet). Wiring the\n" +
      "frontend's deposit() flow to a live address is the actual point of no return --\n" +
      "do that only once you've made that call. See docs/cache-intern-spec.md.\n"
  );

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(usdgTokenAddress, vaultAddress, feeRecipient, feeBps, ownerAddress);
  console.log(`Deploy tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nCacheVaultDeposit deployed to: ${address}`);
  console.log(`\nAdd NEXT_PUBLIC_CACHE_VAULT_ADDRESS=${address} to Vercel's env vars`);
  console.log(`once you're ready to wire the real frontend deposit flow -- see docs/cache-intern-spec.md.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exit(1);
  });
