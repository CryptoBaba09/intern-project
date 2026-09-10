import { createPublicClient, http, isAddress, formatUnits, getAddress } from "viem";
import { robinhoodChain, CONTRACTS, DEAD_ADDRESS, isTradingLive } from "../../../lib/chain";
import { ERC20_ABI } from "../../../lib/abis";
import { isBurnRedeemed, markBurnRedeemed, creditUsd, getBalanceUsd } from "../../../lib/videoCredits";
import { fetchInternPriceUsd } from "../../../lib/ponsPrice";

// Blaze v1: "burn $INTERN -> real video credit" -- the video-generation
// half of the same principle Promptly already ships for text
// (api/promptly/topup/route.js). Verification logic here is intentionally
// identical to Promptly's: re-derive the burn amount from the ON-CHAIN
// RECEIPT itself, never from what the client claims, before crediting
// anything. See videoCredits.js for why this credits an internal ledger
// instead of provisioning a third-party key.

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Video generation costs real money per call (a single Runway clip or
// HeyGen avatar video runs well above a single OpenRouter chat
// completion), so the floor is set higher than Promptly's $0.10 -- below
// this a burn can't even cover one generation at the current fixed price
// (see COST_USD in api/blaze/generate/route.js).
const MIN_CREDIT_USD = 1;

// Live $INTERN/USD price, computed from Pons's own bonding-curve
// reserves (see lib/ponsPrice.js) rather than the now-dead pair.fund
// API this used to call. Replaces the old local fetchInternPriceUsd.

export async function POST(req) {
  try {
    const { address, txHash } = await req.json();

    if (!address || !isAddress(address)) {
      return Response.json({ error: "A connected wallet address is required." }, { status: 400 });
    }
    if (!txHash || typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return Response.json({ error: "A valid transaction hash is required." }, { status: 400 });
    }
    if (!isTradingLive()) {
      return Response.json({ error: "$INTERN isn't live yet." }, { status: 503 });
    }
    if (isBurnRedeemed(txHash)) {
      return Response.json({ error: "This burn has already been redeemed for credit." }, { status: 409 });
    }

    let receipt;
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    } catch {
      return Response.json(
        { error: "Couldn't find that transaction on-chain yet. Make sure it's confirmed and try again." },
        { status: 400 }
      );
    }
    if (!receipt || receipt.status !== "success") {
      return Response.json({ error: "That transaction isn't a confirmed success." }, { status: 400 });
    }

    const normalizedAddress = getAddress(address);
    const tokenAddress = getAddress(CONTRACTS.internToken);
    const deadAddress = getAddress(DEAD_ADDRESS);

    const transferLog = receipt.logs.find((log) => {
      if (getAddress(log.address) !== tokenAddress) return false;
      if (!log.topics || log.topics.length < 3) return false;
      if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) return false;
      const from = getAddress(`0x${log.topics[1].slice(-40)}`);
      const to = getAddress(`0x${log.topics[2].slice(-40)}`);
      return from === normalizedAddress && to === deadAddress;
    });

    if (!transferLog) {
      return Response.json(
        { error: "That transaction isn't a $INTERN transfer from your wallet to the dead address." },
        { status: 400 }
      );
    }

    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    });

    const amountBurned = Number(formatUnits(BigInt(transferLog.data), decimals));
    const priceUsd = await fetchInternPriceUsd();
    const creditAddedUsd = amountBurned * priceUsd;

    if (creditAddedUsd < MIN_CREDIT_USD) {
      return Response.json(
        {
          error: `That burn is worth $${creditAddedUsd.toFixed(
            4
          )} at the current price — below the $${MIN_CREDIT_USD.toFixed(2)} minimum for video credit. Burn more $INTERN in one transaction.`,
        },
        { status: 400 }
      );
    }

    // Credit before marking redeemed -- if the process crashes between
    // these two lines a retry with the same hash just re-credits (bad,
    // double-spend on our own dime) rather than losing the credit
    // (worse, user's real burn vanishes). Given this is an in-memory
    // ledger already disclosed as best-effort for a low-traffic beta,
    // erring toward "we might overpay" over "we might steal a real burn"
    // is the deliberate tradeoff here.
    const newBalanceUsd = creditUsd(normalizedAddress, creditAddedUsd);
    markBurnRedeemed(txHash);

    return Response.json({
      status: "credited",
      creditAddedUsd,
      newBalanceUsd,
      priceUsdAtBurn: priceUsd,
      amountBurned,
      message: "Video credit added. Head to the generator to spend it.",
    });
  } catch (err) {
    console.error("[blaze] topup error:", err);
    return Response.json({ error: "Something went wrong crediting that burn." }, { status: 500 });
  }
}

export async function GET(req) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address || !isAddress(address)) {
    return Response.json({ error: "A valid address is required." }, { status: 400 });
  }
  return Response.json({ balanceUsd: getBalanceUsd(address) });
}
