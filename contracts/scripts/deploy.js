// Deploys InternStakingRewards. Reads addresses from env vars so the same
// script works for a local Hardhat network test deploy, a forked-mainnet
// dry run, or the real Robinhood Chain deployment.
//
// Usage:
//   INTERN_TOKEN_ADDRESS=0x... BE_TOKEN_ADDRESS=0x... OWNER_ADDRESS=0x... \
//     npx hardhat run scripts/deploy.js --network <network>
//
// OWNER_ADDRESS should be the burn bot's wallet (the same PRIVATE_KEY it
// runs with) -- it's the only address allowed to call notifyRewardAmount.
const hre = require("hardhat");

async function main() {
  const internTokenAddress = process.env.INTERN_TOKEN_ADDRESS;
  const beTokenAddress = process.env.BE_TOKEN_ADDRESS;
  const ownerAddress = process.env.OWNER_ADDRESS;

  for (const [name, value] of Object.entries({
    INTERN_TOKEN_ADDRESS: internTokenAddress,
    BE_TOKEN_ADDRESS: beTokenAddress,
    OWNER_ADDRESS: ownerAddress,
  })) {
    if (!value) throw new Error(`Missing required env var: ${name}`);
  }

  console.log("Deploying InternStakingRewards with:");
  console.log(`  staking token ($INTERN): ${internTokenAddress}`);
  console.log(`  reward token (BE):       ${beTokenAddress}`);
  console.log(`  owner (burn bot wallet): ${ownerAddress}`);

  const StakingRewards = await hre.ethers.getContractFactory("InternStakingRewards");
  const staking = await StakingRewards.deploy(internTokenAddress, beTokenAddress, ownerAddress);
  await staking.waitForDeployment();

  const address = await staking.getAddress();
  console.log(`\nInternStakingRewards deployed to: ${address}`);
  console.log(
    "\nNext steps:\n" +
      `  1. Set DISTRIBUTOR_ADDRESS=${address} in intern-burn-bot's Railway variables.\n` +
      "  2. Verify the contract source on Blockscout so stakers can read it before trusting it with funds.\n" +
      "  3. Get a security review beyond this repo's own tests before real value flows through it.\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
