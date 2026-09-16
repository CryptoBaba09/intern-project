const { ethers } = require("ethers");

// Verified directly against live chain state on 2026-09-11 (curl-based
// eth_call, selectors computed from keccak256, cross-checked against
// docs.ponsfamily.com/v2's own code samples) -- not guessed. See the
// "Contracts" / "Buying and selling" / "Getting a quote" / "Claiming
// fees" sections of those docs for the source of every ABI entry below.
const FACTORY_ABI = [
  "function getLaunchedToken(address token) view returns (tuple(address token, address curve, address deployer, address creatorFeeRecipient, address pairToken, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, uint16 creatorTaxBps, bool buybackEnabled, uint8 phase, uint256 sweptQuote, uint256 sweptTokens, uint256 sweptAt, bool exists) launch)",
];

const CURVE_ABI = [
  "function buy(uint256 quoteIn, uint256 minTokensOut, address recipient) payable returns (uint256 tokensOut)",
  "function sell(uint256 tokensIn, uint256 minQuoteOut, address recipient) returns (uint256 quoteOut)",
  "function getReserves() view returns (uint256 quoteReserve, uint256 tokenReserve)",
  "function sellableTokens() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function creatorTaxBps() view returns (uint256)",
  "function quoteFeeBalance() view returns (uint256)",
  "function creatorTaxBalance() view returns (uint256)",
  "function sweepFees(uint256 minBuybackTokensOut)",
  "function graduated() view returns (bool)",
  "function pairToken() view returns (address)",
];

// Fees are credited to this shared escrow, keyed per recipient, only
// after sweepFees() moves them off the curve -- see claimFees.js. claim()
// takes no argument: it always withdraws the CALLER's own balance, never
// an arbitrary account's. That's the source of the wallet-mismatch issue
// documented in claimFees.js -- read that before assuming this bot can
// claim on the creator's behalf just because it holds the right address.
const ESCROW_ABI = [
  "function balanceOf(address recipient) view returns (uint256)",
  "function claim()",
];

/**
 * Resolves a launch's curve address from the factory rather than
 * hardcoding it -- Pons's own docs recommend this explicitly ("Resolve
 * each launch's own curve and token from the factory rather than
 * hardcoding them, since those are created per launch"). Throws if the
 * token was never launched through this factory, or if it's already
 * graduated (phase !== 0) and buy()/sell() would revert with
 * CurveGraduated -- this bot does not yet implement the post-graduation
 * Uniswap v4 pool path.
 */
async function resolveLaunch({ provider, config }) {
  const factory = new ethers.Contract(config.factoryAddress, FACTORY_ABI, provider);
  const launch = await factory.getLaunchedToken(config.internTokenAddress);

  if (!launch.exists) {
    throw new Error(
      `${config.internTokenAddress} is not a recognized Pons launch on factory ${config.factoryAddress}.`
    );
  }
  if (launch.phase !== 0n && launch.phase !== 0) {
    throw new Error(
      `$INTERN has graduated (phase ${launch.phase}) -- this bot only trades the pre-graduation curve. ` +
        "Needs a Uniswap v4 pool path added before it can buy/sell/claim on a graduated launch."
    );
  }
  return launch;
}

function getCurve({ address, signerOrProvider }) {
  return new ethers.Contract(address, CURVE_ABI, signerOrProvider);
}

function getEscrow({ config, signerOrProvider }) {
  return new ethers.Contract(config.feeEscrowAddress, ESCROW_ABI, signerOrProvider);
}

module.exports = { resolveLaunch, getCurve, getEscrow };
