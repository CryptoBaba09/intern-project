import { createPublicClient, http, isAddress, formatUnits, getAddress } from "viem";
import { robinhoodChain, CONTRACTS, DEAD_ADDRESS, isTradingLive } from "../../../lib/chain";
import { ERC20_ABI } from "../../../lib/abis";
import { fetchInternPriceUsd } from "../../../lib/ponsPrice";

// Promptly v1: the real, self-contained half of the Inference Intern
// vision ("pay $INTERN directly for an instant top-up" from the
// /inference-credits copy) -- the OTHER half, a treasury-funded pool split
// pro-rata by stake, needs real fee revenue flowing that doesn't exist
// yet, so it stays a mockup. This route needs nothing from that pool: a
// user burns their own $INTERN, gets a real, spend-capped OpenRouter key
// funded at the live $INTERN/USD price -- the same "value in equals
// credit out, at face value" principle the page already promises, just
// paid directly instead of pooled.
//
// Flow: the client sends a real ERC-20 transfer() of $INTERN to the dead
// address (a wallet-signed on-chain tx -- this route can't do that part
// for them), then calls this route with the resulting tx hash. The
// transfer amount is re-derived from the ON-CHAIN RECEIPT itself, never
// from whatever the client claims, before any credit is minted.

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

// keccak256("Transfer(address,address,uint256)") -- the standard ERC-20
// Transfer event topic, checked explicitly so we never mistake some other
// 3-topic log for a real transfer.
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Known, disclosed limitation, same shape as Rendo's usage Map: no
// database yet, so (a) which OpenRouter key belongs to which wallet and
// (b) which burn tx hashes have already been redeemed both live in memory
// only, and reset on every cold start/redeploy. Fine for a low-traffic v1
// -- the burn itself is irreversible and already permanent on-chain
// regardless of what this server remembers, so a "lost" mapping just means
// contacting the team to manually re-link a wallet to its key, not a loss
// of funds.
const redeemedTxHashes = new Set();
const openRouterKeyByAddress = new Map(); // lowercase address -> { hash }

const MIN_CREDIT_USD = 0.1;

// Live $INTERN/USD price, computed from Pons's own bonding-curve
// reserves (see lib/ponsPrice.js) rather than the now-dead pair.fund
// API this used to call.

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
    if (redeemedTxHashes.has(txHash.toLowerCase())) {
      return Response.json({ error: "This burn has already been redeemed for credit." }, { status: 409 });
    }
    if (!process.env.OPENROUTER_PROVISIONING_KEY) {
      return Response.json(
        { error: "Promptly isn't configured yet -- missing provisioning key server-side." },
        { status: 503 }
      );
    }

    // Verify the burn for real, from the receipt -- never trust a
    // client-supplied amount. A hash that doesn't exist yet (typo, or a
    // tx that hasn't confirmed) throws here rather than returning null --
    // caught separately so it reads as a normal 400, not a scary 500.
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
    const creditUsd = amountBurned * priceUsd;

    if (creditUsd < MIN_CREDIT_USD) {
      return Response.json(
        {
          error: `That burn is worth $${creditUsd.toFixed(4)} at the current price — below the $${MIN_CREDIT_USD.toFixed(
            2
          )} minimum. Burn more $INTERN in one transaction.`,
        },
        { status: 400 }
      );
    }

    const addressKey = normalizedAddress.toLowerCase();
    const existing = openRouterKeyByAddress.get(addressKey);

    if (existing) {
      // Top up: OpenRouter's PATCH replaces `limit` outright rather than
      // incrementing it, so read the current value first.
      const getRes = await fetch(`https://openrouter.ai/api/v1/keys/${existing.hash}`, {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_PROVISIONING_KEY}` },
      });
      if (!getRes.ok) {
        const detail = await getRes.text();
        console.error("[promptly] OpenRouter key lookup error:", getRes.status, detail);
        throw new Error("OpenRouter key lookup failed");
      }
      const getData = await getRes.json();
      const currentLimit = Number(getData.data?.limit ?? getData.limit ?? 0);
      const newLimit = currentLimit + creditUsd;

      const patchRes = await fetch(`https://openrouter.ai/api/v1/keys/${existing.hash}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_PROVISIONING_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ limit: newLimit }),
      });
      if (!patchRes.ok) {
        const detail = await patchRes.text();
        console.error("[promptly] OpenRouter top-up error:", patchRes.status, detail);
        throw new Error("OpenRouter top-up failed");
      }

      // Only mark the burn redeemed once the credit actually landed.
      redeemedTxHashes.add(txHash.toLowerCase());

      return Response.json({
        status: "topped_up",
        creditAddedUsd: creditUsd,
        newLimitUsd: newLimit,
        priceUsdAtBurn: priceUsd,
        amountBurned,
        message:
          "Topped up your existing key. OpenRouter doesn't let us show the secret again — use the one you saved the first time.",
      });
    }

    // First top-up for this wallet: create a new key.
    const createRes = await fetch("https://openrouter.ai/api/v1/keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_PROVISIONING_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: `intern-${normalizedAddress}`,
        limit: creditUsd,
      }),
    });
    if (!createRes.ok) {
      const detail = await createRes.text();
      console.error("[promptly] OpenRouter create error:", createRes.status, detail);
      throw new Error("OpenRouter key creation failed");
    }
    const createData = await createRes.json();
    const secretKey = createData.key ?? createData.data?.key;
    const keyHash = createData.data?.hash ?? createData.hash;

    if (!secretKey || !keyHash) {
      console.error("[promptly] Unexpected OpenRouter create response shape:", JSON.stringify(createData));
      throw new Error("Unexpected response from OpenRouter");
    }

    openRouterKeyByAddress.set(addressKey, { hash: keyHash });
    redeemedTxHashes.add(txHash.toLowerCase());

    return Response.json({
      status: "created",
      key: secretKey,
      creditUsd,
      priceUsdAtBurn: priceUsd,
      amountBurned,
      message: "Save this key now — OpenRouter only shows it once. Future burns from this wallet top up the same key.",
    });
  } catch (err) {
    console.error("[promptly] topup error:", err);
    return Response.json({ error: "Something went wrong crediting that burn." }, { status: 500 });
  }
}
