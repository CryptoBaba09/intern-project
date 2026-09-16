const { ethers } = require("ethers");

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
];

/**
 * Sends $INTERN to the dead address. This is standard ERC20 logic and
 * works regardless of which launchpad $INTERN is deployed through — no
 * placeholder needed here, unlike claimFees/swap which depend on PAIR's
 * specific contracts.
 */
async function burnIntern({ wallet, config, amount, dryRun }) {
  if (amount === 0n) {
    console.log("[burn] Nothing to burn this run.");
    return;
  }

  const internToken = new ethers.Contract(
    config.internTokenAddress,
    ERC20_ABI,
    wallet
  );

  console.log(
    `[burn] Sending ${ethers.formatEther(amount)} INTERN to ${config.deadAddress}...`
  );

  if (dryRun) {
    console.log("[burn] DRY_RUN — skipping actual burn transaction.");
    return;
  }

  const tx = await internToken.transfer(config.deadAddress, amount);
  console.log(`[burn] Burn tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(
    `[burn] Burn confirmed in block ${receipt.blockNumber} — this tx hash is your public proof, post it.`
  );
}

module.exports = { burnIntern };
