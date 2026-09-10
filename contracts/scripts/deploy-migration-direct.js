// Same rationale as deploy-direct.js: `npx hardhat run` / `hardhat test`
// hangs indefinitely on this machine (near-zero CPU, confirmed even after
// a Node 22 upgrade), so this deploys InternMigration with plain ethers.js
// against a solc-compiled artifact, bypassing the Hardhat runtime for this
// step entirely.
//
// Usage:
//   V1_TOKEN_ADDRESS=0x... V2_TOKEN_ADDRESS=0x... RATIO=1000000000000000000 \
//     CLAIM_WINDOW_SECONDS=7776000 OWNER_ADDRESS=0x... \
//     node scripts/deploy-migration-direct.js
// Reads PRIVATE_KEY from contracts/.env (same as deploy-direct.js).
//
// RATIO is v2-out-per-v1-in scaled by 1e18 -- 1000000000000000000 = 1:1.
// CLAIM_WINDOW_SECONDS is how long migration stays open -- 7776000 = 90 days.
//
// After deploying, the contract must be funded with enough v2 $INTERN to
// cover every holder's migration before anyone can claim -- it holds none
// of its own. Send v2 tokens to the deployed address directly (a plain
// ERC-20 transfer, not a contract call).
require("dotenv").config();
const { ethers } = require("ethers");
const artifact = require("../artifacts/contracts/InternMigration.sol/InternMigration.json");

const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

async function main() {
  const v1TokenAddress = process.env.V1_TOKEN_ADDRESS;
  const v2TokenAddress = process.env.V2_TOKEN_ADDRESS;
  const ratio = process.env.RATIO;
  const claimWindowSeconds = process.env.CLAIM_WINDOW_SECONDS;
  const ownerAddress = process.env.OWNER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  for (const [name, value] of Object.entries({
    V1_TOKEN_ADDRESS: v1TokenAddress,
    V2_TOKEN_ADDRESS: v2TokenAddress,
    RATIO: ratio,
    CLAIM_WINDOW_SECONDS: claimWindowSeconds,
    OWNER_ADDRESS: ownerAddress,
    PRIVATE_KEY: privateKey,
  })) {
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

  console.log("Deploying InternMigration with:");
  console.log(`  v1 token:      ${v1TokenAddress}`);
  console.log(`  v2 token:      ${v2TokenAddress}`);
  console.log(`  ratio:         ${ratio} (${ethers.formatEther(ratio)} v2 per v1)`);
  console.log(`  claim window:  ${claimWindowSeconds}s (${(Number(claimWindowSeconds) / 86400).toFixed(1)} days)`);
  console.log(`  owner:         ${ownerAddress}`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(v1TokenAddress, v2TokenAddress, ratio, claimWindowSeconds, ownerAddress);
  console.log(`Deploy tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nInternMigration deployed to: ${address}`);
  console.log(`Remember: fund this address with v2 $INTERN before announcing migration is live.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exit(1);
  });
