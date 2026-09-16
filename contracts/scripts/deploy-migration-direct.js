// Bypasses Hardhat's own `hardhat run` task orchestration entirely --
// see deploy-direct.js for why (this machine's Hardhat test/run tasks
// hang indefinitely). Deploys InternMigration with plain ethers.js
// against the already-compiled artifact, no Hardhat runtime needed.
//
// Usage:
//   V1_TOKEN_ADDRESS=0x... V2_TOKEN_ADDRESS=0x... RATIO=1000000000000000000 \
//     CLAIM_WINDOW_SECONDS=1814400 OWNER_ADDRESS=0x... \
//     node scripts/deploy-migration-direct.js
// Reads PRIVATE_KEY from contracts/.env (same as deploy-direct.js).
//
// RATIO is scaled by 1e18 -- 1000000000000000000 means 1:1 (1 v2 $INTERN
// per 1 v1 $INTERN burned). CLAIM_WINDOW_SECONDS is how long migrate()
// stays open from the moment this deploy tx confirms -- 1814400 = 21 days.
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
  console.log(`  ratio:         ${ratio} (${ethers.formatUnits(ratio, 18)} v2 per v1)`);
  console.log(`  claim window:  ${claimWindowSeconds}s (${(Number(claimWindowSeconds) / 86400).toFixed(2)} days)`);
  console.log(`  owner:         ${ownerAddress}`);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(
    v1TokenAddress,
    v2TokenAddress,
    ratio,
    claimWindowSeconds,
    ownerAddress,
  );
  console.log(`Deploy tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nInternMigration deployed to: ${address}`);
  console.log(`\nNext: fund this contract with v2 $INTERN (send it directly, no special function --`);
  console.log(`it just needs a balance to pay out from) covering all v1 holders' balances at the ratio above.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exit(1);
  });
