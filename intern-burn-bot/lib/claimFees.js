const { ethers } = require("ethers");
const { getPoolInfo } = require("./pairContracts");

// Verified against PairV4Locker's ABI on Blockscout
// (0xeFcF476E8870fB3eb8680f039414fdcCE6C2a117) — see https://pair.fund/docs.
//
// Two things this corrects from an earlier placeholder version:
// 1. Claiming is a two-step process — collectFees(tokenId) sweeps a locked
//    position's accumulated fees into claimable balances (permissionless;
//    PAIR's own keeper also does this, but we don't want to depend on its
//    timing matching ours), then claim(asset) actually withdraws a balance.
// 2. Fees accrue in BOTH assets a pool trades — the project token
//    ($INTERN) and the quote token (BE) — as separate balances, not one
//    combined "creator fee" paid only in BE.
const LOCKER_ABI = [
  "function claim(address asset) external returns (uint256 amount)",
  // Blockscout's verified ABI has this taking two unnamed addresses; the
  // parameter order (account, asset) below is inferred from convention,
  // not confirmed from a named signature. If claimable() ever reads back
  // 0 when you know a balance should exist, double check this order
  // against https://pair.fund/api/fees/claimable/<wallet> (documented at
  // pair.fund/docs) before assuming something else is wrong.
  "function claimable(address account, address asset) view returns (uint256)",
  "function collectFees(uint256 tokenId) external",
];

/**
 * Claims $INTERN's accumulated creator fees from PAIR — in both BE and
 * $INTERN, since a pool's swap fees land in whichever token was sold at
 * the time. Must be called from the wallet that launched $INTERN; PAIR
 * enforces creator-only claims on-chain.
 *
 * Returns { beClaimed, internClaimed } — the caller is responsible for
 * routing each separately (BE needs the 70/20/10 split and a swap for the
 * burn bucket; $INTERN claimed directly needs no swap, it can be burned
 * as-is).
 */
async function claimFees({ wallet, config, dryRun }) {
  const { positionId, quoteToken } = await getPoolInfo({ provider: wallet.provider, config });
  const locker = new ethers.Contract(config.feeClaimContractAddress, LOCKER_ABI, wallet);

  console.log(`[claimFees] Sweeping fees for locked position #${positionId}...`);
  if (dryRun) {
    console.log("[claimFees] DRY_RUN — skipping collectFees transaction.");
  } else {
    try {
      const collectTx = await locker.collectFees(positionId);
      console.log(`[claimFees] collectFees tx sent: ${collectTx.hash}`);
      await collectTx.wait();
      console.log("[claimFees] collectFees confirmed.");
    } catch (err) {
      // Permissionless, and PAIR's own keeper may have already swept this
      // position this cycle — that's not a failure, just means there's
      // nothing new to collect. Whatever is already claimable still gets
      // claimed below either way.
      console.log(
        `[claimFees] collectFees skipped (${err.shortMessage || err.message}) — ` +
          "continuing with whatever is already claimable."
      );
    }
  }

  const assets = [
    { label: "BE", address: quoteToken },
    { label: "$INTERN", address: config.internTokenAddress },
  ];

  let beClaimed = 0n;
  let internClaimed = 0n;

  for (const asset of assets) {
    const claimableAmount = await locker.claimable(wallet.address, asset.address);
    console.log(`[claimFees] Claimable in ${asset.label}: ${ethers.formatEther(claimableAmount)}`);

    if (claimableAmount === 0n) continue;

    if (dryRun) {
      console.log(`[claimFees] DRY_RUN — skipping claim of ${asset.label}.`);
    } else {
      const tx = await locker.claim(asset.address);
      console.log(`[claimFees] claim(${asset.label}) tx sent: ${tx.hash}`);
      await tx.wait();
      console.log(`[claimFees] claim(${asset.label}) confirmed.`);
    }

    if (asset.label === "BE") beClaimed = claimableAmount;
    else internClaimed = claimableAmount;
  }

  return { beClaimed, internClaimed };
}

module.exports = { claimFees };
