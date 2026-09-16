// Bypasses Hardhat's own `hardhat run` task orchestration entirely --
// found (2026-09-06) that `npx hardhat run scripts/deploy.js --network
// robinhoodChain` hangs indefinitely on this machine with near-zero CPU
// usage, even after upgrading to Node 22 (ruling out the Node-version
// warning as the cause). This does the exact same deployment with plain
// ethers.js against the already-compiled artifact, no Hardhat runtime
// needed for this step.
//
// Usage:
//   INTERN_TOKEN_ADDRESS=0x... BE_TOKEN_ADDRESS=0x... OWNER_ADDRESS=0x... \
//     node scripts/deploy-direct.js
// Reads PRIVATE_KEY from contracts/.env (same as the Hardhat version did).
require("dotenv").config();
const { ethers } = require("ethers");
const artifact = require("../artifacts/contracts/InternStakingRewards.sol/InternStakingRewards.json");

const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

async function main() {
  const internTokenAddress = process.env.INTERN_TOKEN_ADDRESS;
  const beTokenAddress = process.env.BE_TOKEN_ADDRESS;
  const ownerAddress = process.env.OWNER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  for (const [name, value] of Object.entries({
    INTERN_TOKEN_ADDRESS: internTokenAddress,
    BE_TOKEN_ADDRESS: beTokenAddress,
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

  console.log("Deploying InternStakingRewards with:");
  console.log(`  staking token: ${internTokenAddress}`);
  console.log(`  reward token:  ${beTokenAddress}`);
  console.log(`  owner:         ${ownerAddress}`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(internTokenAddress, beTokenAddress, ownerAddress);
  console.log(`Deploy tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nInternStakingRewards deployed to: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exit(1);
  });
