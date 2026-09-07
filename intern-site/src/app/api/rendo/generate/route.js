import { createPublicClient, http, isAddress, formatUnits } from "viem";
import { robinhoodChain, CONTRACTS } from "../../../lib/chain";
import { ERC20_ABI, STAKING_REWARDS_ABI } from "../../../lib/abis";

// Rendo v1 beta: text-only content generation (captions, post ideas, short
// scripts), gated by REAL staked $INTERN read live on-chain -- not a
// client-supplied number. The full "AI video avatar" vision on the
// personas page is still planned/unbuilt; this is the first real slice of
// it, scoped down to what's actually achievable without picking and
// paying for a separate image/video generation provider first.
const TIERS = [
  { name: "Full-Time Offer", minStaked: 1_000_000, dailyLimit: 20 },
  { name: "Senior Intern", minStaked: 100_000, dailyLimit: 8 },
  { name: "Intern", minStaked: 10_000, dailyLimit: 3 },
];

function tierFor(stakedNumber) {
  return TIERS.find((t) => stakedNumber >= t.minStaked) ?? null;
}

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

// Known, disclosed limitation: there is no database wired up for this
// project yet, so daily usage is tracked in this in-memory Map instead of
// a persisted store. That's a real, soft limit -- it resets on every cold
// start / redeploy, and isn't shared across concurrent serverless
// instances. Fine for a low-traffic beta where the real backstop is the
// on-chain stake check below (which IS airtight); replace this with a
// real persisted counter before Rendo leaves beta.
const usage = new Map(); // key: `${address}:${yyyy-mm-dd}` -> count

function todayKey(address) {
  return `${address.toLowerCase()}:${new Date().toISOString().slice(0, 10)}`;
}

export async function POST(req) {
  try {
    const { address, prompt } = await req.json();

    if (!address || !isAddress(address)) {
      return Response.json({ error: "A connected wallet address is required." }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json({ error: "Tell Rendo what to write." }, { status: 400 });
    }
    if (prompt.length > 500) {
      return Response.json({ error: "Keep the prompt under 500 characters." }, { status: 400 });
    }
    if (!CONTRACTS.distributor || !CONTRACTS.internToken) {
      return Response.json({ error: "Staking isn't live yet." }, { status: 503 });
    }

    // Real on-chain check -- this is the actual gate, not the client's word.
    const [stakedRaw, decimals] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.distributor,
        abi: STAKING_REWARDS_ABI,
        functionName: "balanceOf",
        args: [address],
      }),
      publicClient.readContract({
        address: CONTRACTS.internToken,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
    ]);

    const stakedNumber = Number(formatUnits(stakedRaw, decimals));
    const tier = tierFor(stakedNumber);

    if (!tier) {
      return Response.json(
        {
          error: `Stake at least 10,000 $INTERN to unlock Rendo. You currently have ${stakedNumber.toLocaleString()} staked.`,
        },
        { status: 403 }
      );
    }

    const key = todayKey(address);
    const used = usage.get(key) ?? 0;
    if (used >= tier.dailyLimit) {
      return Response.json(
        { error: `Daily limit reached for your tier (${tier.name}: ${tier.dailyLimit}/day). Try again tomorrow.` },
        { status: 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "Rendo isn't configured yet — missing API key server-side." },
        { status: 503 }
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // Haiku 4.5 -- fast and cheap, the right fit for a high-volume
        // beta feature with per-tier daily generation limits rather than
        // one-off deep work.
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system:
          "You are Rendo, the $INTERN protocol's media intern -- a content-creation assistant unlocked by staking $INTERN. Write punchy, concise, usable short-form content (a caption, a post idea, or a short script) based on exactly what the user asks for. No preamble, no \"here's your content:\" framing -- just the content itself. Keep it tight.",
        messages: [{ role: "user", content: prompt.trim() }],
      }),
    });

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      console.error("[rendo] Anthropic API error:", anthropicRes.status, detail);
      return Response.json({ error: "Rendo is having trouble right now. Try again shortly." }, { status: 502 });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text ?? "";

    usage.set(key, used + 1);

    return Response.json({
      text,
      tier: tier.name,
      usedToday: used + 1,
      dailyLimit: tier.dailyLimit,
    });
  } catch (err) {
    console.error("[rendo] generate error:", err);
    return Response.json({ error: "Something went wrong generating that." }, { status: 500 });
  }
}
