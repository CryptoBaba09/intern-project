// Bypasses Hardhat's own `hardhat run` task orchestration entirely --
// see deploy-direct.js for why (this project's iCloud-synced working
// directory hangs Hardhat's own test/run tasks; root-caused and fixed
// by running from a plain, non-iCloud path instead). Deploys
// CacheBorrow with plain ethers.js against the already-compiled
// artifact, no Hardhat runtime needed. Same shape as
// deploy-cache-vault-deposit-direct.js.
//
// Usage (every address below defaults to the real, verified Robinhood
// Chain deployment -- override only if you have a specific reason to):
//   OWNER_ADDRESS=0x... node scripts/deploy-cache-borrow-direct.js
// Reads PRIVATE_KEY from contracts/.env (same as every other
// deploy-*-direct.js script in this folder).
//
// STOP AND READ FIRST: this contract has been unit-tested (33/33
// passing, verified 2026-09-23) and passed an in-house Slither +
// manual review pass (see docs/cache-borrow-spec.md). It has NOT had
// an independent professional security audit. It carries real
// liquidation and oracle risk to end users that CacheVaultDeposit does
// not. Deploying it does NOT allowlist any market -- no market is
// reachable through this contract until setMarketAllowed() is called
// separately (see the printed follow-up instructions below). Deploying
// is a separate, deliberate decision from deciding it's safe to point
// real user collateral/liquidity at it.
require("dotenv").config();
const { ethers } = require("ethers");
const artifact = require("../artifacts/contracts/CacheBorrow.sol/CacheBorrow.json");

const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

// Real, deployed Robinhood Chain addresses -- confirmed live on
// 2026-09-23 (see docs/cache-borrow-spec.md: every IMorpho selector
// confirmed present in the real deployed bytecode, plus a live
// isAuthorized() read), not guessed.
const DEFAULT_MORPHO = "0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010";
const DEFAULT_USDG_TOKEN = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const DEFAULT_FEE_BPS = 20; // 0.2%, same rate as CacheVaultDeposit and $interndex

async function main() {
  const morphoAddress = process.env.MORPHO_ADDRESS || DEFAULT_MORPHO;
  const usdgTokenAddress = process.env.USDG_TOKEN_ADDRESS || DEFAULT_USDG_TOKEN;
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

  console.log("\nDeploying CacheBorrow with:");
  console.log(`  Morpho core:   ${morphoAddress}`);
  console.log(`  USDG token:    ${usdgTokenAddress}`);
  console.log(`  fee bps:       ${feeBps} (${feeBps / 100}%)`);
  console.log(`  fee recipient: ${feeRecipient}`);
  console.log(`  owner:         ${ownerAddress}`);

  console.log(
    "\n*** This contract has NOT had an independent professional security audit. ***\n" +
      "It carries real liquidation and oracle risk CacheVaultDeposit does not. Deploying\n" +
      "does NOT allowlist any market -- nothing is reachable through this contract until\n" +
      "setMarketAllowed() is called separately for each real, vetted market. See\n" +
      "docs/cache-borrow-spec.md.\n"
  );

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(morphoAddress, usdgTokenAddress, feeRecipient, feeBps, ownerAddress);
  console.log(`Deploy tx sent: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nCacheBorrow deployed to: ${address}`);
  console.log(`\nNo market is allowlisted yet. To allowlist the one market that's currently`);
  console.log(`both real-liquidity and factory-oracle-verified (TSLA, 62.5% LLTV), call`);
  console.log(`setMarketAllowed() from the owner wallet (${ownerAddress}) with:`);
  console.log(`  loanToken:       ${usdgTokenAddress} (USDG)`);
  console.log(`  collateralToken: 0x322F0929c4625eD5bAd873c95208D54E1c003b2d (TSLA)`);
  console.log(`  oracle:          0xCa76875634e0b9759AA6610dC3092e92fcefE46E`);
  console.log(`  irm:             0x2BD3d5965B26B51814AC95127B2b80dD6CcC0fa1`);
  console.log(`  lltv:            625000000000000000 (62.5%)`);
  console.log(`\nThen add NEXT_PUBLIC_CACHE_BORROW_ADDRESS=${address} to Vercel's env vars`);
  console.log(`once the frontend for this exists -- see docs/cache-borrow-spec.md.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exit(1);
  });
