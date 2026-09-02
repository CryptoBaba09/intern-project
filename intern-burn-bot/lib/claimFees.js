const { ethers } = require("ethers");

// PLACEHOLDER ABI — replace once PAIR publishes their fee-claim contract's
// real interface (check their docs or block explorer once $INTERN is live).
// Most launchpads in this pattern (Pons, PAIR) expose something shaped like
// this: a per-token claim() that pays accumulated fees to the caller if the
// caller is the token's creator wallet.
const FEE_CLAIM_ABI = [
  "function claim(address token) external",
  "function claimable(address token, address creator) external view returns (uint256)",
];

/**
 * Claims accumulated creator fees (in the pairing asset, e.g. BE) for
 * $INTERN from PAIR's fee-claim contract, paying them to the connected
 * wallet. Must be called from the same wallet that launched the token —
 * every launchpad we checked enforces this.
 */
async function claimFees({ wallet, config, dryRun }) {
  const claimContract = new ethers.Contract(
    config.feeClaimContractAddress,
    FEE_CLAIM_ABI,
    wallet
  );

  const claimableAmount = await claimContract.claimable(
    config.internTokenAddress,
    wallet.address
  );

  console.log(
    `[claimFees] Claimable: ${ethers.formatEther(claimableAmount)} BE`
  );

  if (claimableAmount === 0n) {
    console.log("[claimFees] Nothing to claim right now.");
    return 0n;
  }

  if (dryRun) {
    console.log("[claimFees] DRY_RUN — skipping actual claim transaction.");
    return claimableAmount;
  }

  const tx = await claimContract.claim(config.internTokenAddress);
  console.log(`[claimFees] Claim tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[claimFees] Claim confirmed in block ${receipt.blockNumber}`);

  return claimableAmount;
}

module.exports = { claimFees };
