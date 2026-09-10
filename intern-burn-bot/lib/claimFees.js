const { ethers } = require("ethers");
const { resolveLaunch, getCurve, getEscrow } = require("./ponsContracts");

// Two-step process on Pons v2, different in shape from v1's PAIR flow
// (which is why this file is a rewrite, not a patch): sweepFees() moves
// a curve's accrued fees into the shared fee escrow, credited to the
// launch's creatorFeeRecipient -- then claim() withdraws the CALLER's
// own escrow balance. There is no "claim on behalf of another address"
// path. See docs.ponsfamily.com/v2's "Claiming fees" section.
//
// IMPORTANT, LOAD-BEARING CAVEAT: claim() only ever pays out to
// msg.sender. If this bot's wallet (from PRIVATE_KEY) is not the same
// address as the launch's creatorFeeRecipient, sweepFees() still works
// (permissionless -- anyone can trigger it), but claim() has nothing to
// withdraw for THIS wallet, even though real ETH is sitting in escrow
// under the creator's balance. That's not a bug in this file; it's
// Pons's access control working as designed. Two real fixes, neither of
// which this bot can do for you:
//   1. Run this bot with the creator wallet's own PRIVATE_KEY, or
//   2. Have the creator call transferCreatorFeeRecipient(token, botWallet)
//      once, redirecting future payouts to this bot's wallet.
// claimFees() below detects this exact situation (escrow balance > 0
// for the creator, but this wallet's own claim() reverts or claims 0)
// and logs it loudly rather than silently reporting "nothing to claim."
async function claimFees({ wallet, config, dryRun }) {
  const launch = await resolveLaunch({ provider: wallet.provider, config });
  const curve = getCurve({ address: launch.curve, signerOrProvider: wallet });
  const escrow = getEscrow({ config, signerOrProvider: wallet });

  const [quoteFeeBalance, creatorTaxBalance] = await Promise.all([
    curve.quoteFeeBalance(),
    curve.creatorTaxBalance(),
  ]);
  const pendingOnCurve = quoteFeeBalance + creatorTaxBalance;
  console.log(
    `[claimFees] Pending on curve before sweep: ${ethers.formatEther(pendingOnCurve)} ETH ` +
      `(${ethers.formatEther(quoteFeeBalance)} base fee + ${ethers.formatEther(creatorTaxBalance)} creator tax)`
  );

  if (pendingOnCurve > 0n) {
    console.log("[claimFees] Sweeping curve fees into the escrow...");
    if (dryRun) {
      console.log("[claimFees] DRY_RUN — skipping sweepFees transaction.");
    } else {
      // buybackEnabled is false for this launch (verified on-chain), so
      // minBuybackTokensOut is inert here -- 0 is correct, not a
      // placeholder. If buyback is ever enabled for a future launch
      // this bot also manages, this needs a real slippage-derived value.
      const tx = await curve.sweepFees(0n);
      console.log(`[claimFees] sweepFees tx sent: ${tx.hash}`);
      await tx.wait();
      console.log("[claimFees] sweepFees confirmed.");
    }
  } else {
    console.log("[claimFees] Nothing pending on the curve to sweep.");
  }

  const escrowBalanceForCreator = await escrow.balanceOf(launch.creatorFeeRecipient);
  console.log(
    `[claimFees] Escrow balance for creatorFeeRecipient (${launch.creatorFeeRecipient}): ` +
      `${ethers.formatEther(escrowBalanceForCreator)} ETH`
  );

  const walletIsCreator = wallet.address.toLowerCase() === launch.creatorFeeRecipient.toLowerCase();
  if (escrowBalanceForCreator > 0n && !walletIsCreator) {
    console.warn(
      "[claimFees] ⚠️  Real ETH is sitting in escrow for the creator wallet " +
        `(${launch.creatorFeeRecipient}), but this bot is running as ${wallet.address} -- ` +
        "a DIFFERENT address. claim() only pays the caller's own balance, so this bot " +
        "cannot withdraw it. Either run this bot with the creator wallet's PRIVATE_KEY, " +
        "or have the creator call transferCreatorFeeRecipient(token, thisBotWallet) once. " +
        "Nothing was lost -- the ETH is safe in escrow -- but this cycle claims nothing."
    );
    return { ethClaimed: 0n };
  }

  const ownBalance = await escrow.balanceOf(wallet.address);
  if (ownBalance === 0n) {
    console.log("[claimFees] Nothing claimable for this wallet.");
    return { ethClaimed: 0n };
  }

  console.log(`[claimFees] Claiming ${ethers.formatEther(ownBalance)} ETH from escrow...`);
  if (dryRun) {
    console.log("[claimFees] DRY_RUN — skipping claim transaction.");
    return { ethClaimed: ownBalance };
  }

  const balanceBefore = await wallet.provider.getBalance(wallet.address);
  const tx = await escrow.claim();
  console.log(`[claimFees] claim tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  const balanceAfter = await wallet.provider.getBalance(wallet.address);
  const gasCost = receipt.gasUsed * receipt.gasPrice;
  // Measure the real delta (net of gas) rather than trusting the
  // pre-claim escrow read, same discipline v1's claimFees.js used for
  // ERC20 balances -- more could have been swept between the read above
  // and this transaction confirming.
  const actuallyClaimed = balanceAfter - balanceBefore + gasCost;
  console.log(
    `[claimFees] claim confirmed — received ${ethers.formatEther(actuallyClaimed)} ETH ` +
      `(pre-tx estimate was ${ethers.formatEther(ownBalance)}).`
  );

  return { ethClaimed: actuallyClaimed };
}

module.exports = { claimFees };
