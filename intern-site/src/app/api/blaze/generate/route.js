import { createPublicClient, http, isAddress, formatUnits } from "viem";
import { robinhoodChain, CONTRACTS, videoCreditDiscountForStake } from "../../../lib/chain";
import { STAKING_REWARDS_ABI, ERC20_ABI } from "../../../lib/abis";
import {
  getBalanceUsd,
  debitUsd,
  creditUsd,
  recordGenerationStart,
  updateGenerationStatus,
} from "../../../lib/videoCredits";

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });

// Discount, not a new payout: this reduces what this route charges its
// OWN video-credit ledger, it doesn't move any $INTERN or mint anything
// -- pure pricing, same risk class as a coupon code, not a new
// fund-holding mechanism (contrast with Perky/InternLoyaltyRewards,
// which is real BE payout and genuinely needs its own audit before
// going live -- see docs/loyalty-rewards-spec.md). Tier table itself
// lives in lib/chain.js, shared with the client-side price preview, so
// the two can't drift apart.
async function getStakedTierDiscount(address) {
  if (!CONTRACTS.distributor) return 0;
  try {
    const [staked, decimals] = await Promise.all([
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
    return videoCreditDiscountForStake(Number(formatUnits(staked, decimals)));
  } catch (err) {
    // Fails closed to 0% discount, not open to "free" -- a broken RPC
    // read should never accidentally waive a real cost.
    console.error("[blaze] stake-tier read failed, no discount applied:", err);
    return 0;
  }
}

// Blaze v1: spends video credit (from api/blaze/topup) on a real
// generation call to Runway or HeyGen, executed with THIS SITE's own
// provider key -- never exposed to the client. This is the missing half
// of the original vision (Rendo's route is deliberately text-only; see
// its NatSpec) and the reason it stayed unbuilt until now: it needs
// picking and paying for a real video provider, which this does.
//
// DISCLOSED LIMITATION, same honesty as the rest of this beta: the exact
// request/response shape below is written against Runway's and HeyGen's
// documented REST APIs as of this feature's build date, but has not been
// exercised against a live provider key in this environment. Both provider
// APIs evolve; if either changes shape, this route fails loudly (a 502
// with the provider's own error body logged server-side) rather than
// silently mis-charging credit -- but a maintainer should smoke-test both
// paths against real keys before this leaves beta.

// Flat cost per generation while there's no usage-based billing wired up
// yet. Deliberately conservative relative to what these calls actually
// cost the operator, so a single generation can't drain a burn's credit
// in one accidental click. Revisit once real provider invoices exist to
// calibrate against.
const COST_USD = { runway: 1.5, heygen: 1.5 };

const RUNWAY_BASE = "https://api.dev.runwayml.com";
const RUNWAY_VERSION = "2024-11-06";
const HEYGEN_BASE = "https://api.heygen.com";

// Locked reference stills per persona PER SCENE, served from this
// site's own /public so Runway's servers (which need a URL, not a local
// file) can fetch them. "default" is each persona's original locked
// concept art; other scenes (e.g. "beach") are the same character,
// same head/proportions, re-rendered into a different environment --
// generated once via Runway with the original art as a reference, not
// a separate design. Keeps every user generation anchored to an
// approved still instead of trusting a client-supplied image.
const PERSONA_SCENES = {
  blaze: {
    default: "/personas/blaze.png",
    beach: "/personas/scenes/blaze-beach.png",
  },
  rendo: {
    default: "/personas/rendo.png",
    beach: "/personas/scenes/rendo-beach.png",
  },
  promptly: {
    default: "/personas/promptly.png",
    beach: "/personas/scenes/promptly-beach.png",
  },
  synapse: {
    default: "/personas/synapse.png",
    beach: "/personas/scenes/synapse-beach.png",
  },
};
const DEFAULT_SCENE = "default";
const SCENE_IDS = Object.keys(PERSONA_SCENES.blaze); // same scene set for every persona

// HeyGen avatar IDs are per-account (created via HeyGen's studio, not
// derivable from anything in this repo) -- unset until an operator
// creates real avatar "looks" in HeyGen and fills these in via env
// vars. One look per scene per persona (a HeyGen "look" is scene-
// specific, unlike Runway's img2img which can reuse one still as a
// motion reference for any prompt). Missing ones fail with a clear
// "not configured" error rather than a confusing provider-side 404.
const HEYGEN_AVATAR_ID = {
  blaze: {
    default: process.env.HEYGEN_BLAZE_AVATAR_ID || "",
    beach: process.env.HEYGEN_BLAZE_AVATAR_ID_BEACH || "",
  },
  rendo: {
    default: process.env.HEYGEN_RENDO_AVATAR_ID || "",
    beach: process.env.HEYGEN_RENDO_AVATAR_ID_BEACH || "",
  },
  promptly: {
    default: process.env.HEYGEN_PROMPTLY_AVATAR_ID || "",
    beach: process.env.HEYGEN_PROMPTLY_AVATAR_ID_BEACH || "",
  },
  synapse: {
    default: process.env.HEYGEN_SYNAPSE_AVATAR_ID || "",
    beach: process.env.HEYGEN_SYNAPSE_AVATAR_ID_BEACH || "",
  },
};

function siteOrigin(req) {
  // Prefer an explicit public site URL if set; falls back to deriving it
  // from the incoming request so this also works correctly on Vercel
  // preview deployments without extra config.
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

// Routed through a Runway Model Router config ("intern-video-credits",
// cost-optimized, set up at dev.runwayml.com/organization/.../model-routers)
// rather than a single hardcoded model. The router picks the cheapest
// eligible model across providers (Runway/Alibaba/ByteDance/etc.) that
// supports this request's inputs and tells the task which one it used --
// meaningfully cuts the real per-generation cost this site pays out of
// its own pocket versus always calling Gen-4 Turbo directly, with zero
// change needed here if pricing shifts (the router re-evaluates live).
const RUNWAY_ROUTER_CONFIG_ID = "intern-video-credits";

async function submitRunway(req, { persona, scene, prompt, custom }) {
  if (!process.env.RUNWAYML_API_SECRET) {
    throw Object.assign(new Error("Runway isn't configured yet — missing API key server-side."), {
      status: 503,
    });
  }
  // Custom mode drops promptImage entirely -- pure text-to-video, not
  // anchored to one of the 4 approved persona stills. See
  // docs/custom-video-prompt-spec.md for why this is its own mode
  // rather than just "persona: null" falling through: the router
  // (RUNWAY_ROUTER_CONFIG_ID) picks a text-to-video-capable model on
  // its own once there's no image input, same secret, same config.
  //
  // Confirmed against a real 400 from Runway (2026-09-11, request
  // zp8t5-1789117089311-ad0868abfb0a): the text-to-video schema
  // rejects `ratio` as an unrecognized key -- that field only exists
  // on the image-to-video request shape. duration/promptText are the
  // only inputs the text-to-video schema takes.
  const input = custom
    ? { promptText: prompt, duration: 5 }
    : {
        promptImage: `${siteOrigin(req)}${PERSONA_SCENES[persona][scene]}`,
        promptText: prompt,
        ratio: "1280:720",
        duration: 5,
      };

  const res = await fetch(`${RUNWAY_BASE}/v1/generate/video`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RUNWAYML_API_SECRET}`,
      "X-Runway-Version": RUNWAY_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({ configId: RUNWAY_ROUTER_CONFIG_ID, input }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("[blaze] Runway submit error:", res.status, detail);
    throw Object.assign(new Error("Runway rejected that generation request."), { status: 502 });
  }
  const data = await res.json();
  return { engine: "runway", taskId: data.id };
}

async function submitHeygen({ persona, scene, prompt }) {
  if (!process.env.HEYGEN_API_KEY) {
    throw Object.assign(new Error("HeyGen isn't configured yet — missing API key server-side."), {
      status: 503,
    });
  }
  const avatarId = HEYGEN_AVATAR_ID[persona][scene];
  if (!avatarId) {
    throw Object.assign(
      new Error(
        `No HeyGen avatar configured for ${persona} in the "${scene}" scene yet — try the default scene, or Runway is available in the meantime.`
      ),
      { status: 503 }
    );
  }

  const res = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
          voice: { type: "text", input_text: prompt, voice_id: process.env.HEYGEN_VOICE_ID || "" },
        },
      ],
      dimension: { width: 1280, height: 720 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("[blaze] HeyGen submit error:", res.status, detail);
    throw Object.assign(new Error("HeyGen rejected that generation request."), { status: 502 });
  }
  const data = await res.json();
  const videoId = data.data?.video_id ?? data.video_id;
  if (!videoId) {
    console.error("[blaze] Unexpected HeyGen response shape:", JSON.stringify(data));
    throw Object.assign(new Error("Unexpected response from HeyGen."), { status: 502 });
  }
  return { engine: "heygen", taskId: videoId };
}

// Blunt, honestly-labeled fallback for when OPENAI_API_KEY isn't set --
// a keyword list is not real content moderation, it's a last-resort net
// for the most obvious cases. Kept short and generic on purpose: this
// is a safety net, not the actual moderation layer (see
// docs/custom-video-prompt-spec.md, "Moderation" section).
const DENYLIST_FALLBACK = [
  "child sex", "csam", "rape", "kill myself", "suicide method",
  "bomb making", "school shooting",
];

// Real moderation only runs when OPENAI_API_KEY is configured -- until
// then this route is explicit (in its own error text via the denylist
// path, and in the spec doc) that it's running the weaker fallback,
// rather than silently claiming a review that isn't happening.
async function moderatePrompt(prompt) {
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ input: prompt }),
      });
      if (!res.ok) {
        console.error("[blaze] moderation API error:", res.status, await res.text());
        // Fail closed on a broken moderation call -- better to block a
        // legitimate generation than let an unmoderated one through.
        return { flagged: true, reason: "moderation check unavailable, try again shortly" };
      }
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.flagged) {
        const categories = Object.entries(result.categories || {})
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ");
        return { flagged: true, reason: categories || undefined };
      }
      return { flagged: false };
    } catch (err) {
      console.error("[blaze] moderation call failed:", err);
      return { flagged: true, reason: "moderation check unavailable, try again shortly" };
    }
  }

  const lower = prompt.toLowerCase();
  const hit = DENYLIST_FALLBACK.find((term) => lower.includes(term));
  return hit ? { flagged: true } : { flagged: false };
}

export async function POST(req) {
  try {
    const { address, engine, persona, scene, prompt, custom, acknowledged } = await req.json();

    if (!address || !isAddress(address)) {
      return Response.json({ error: "A connected wallet address is required." }, { status: 400 });
    }
    if (engine !== "runway" && engine !== "heygen") {
      return Response.json({ error: "engine must be 'runway' or 'heygen'." }, { status: 400 });
    }
    if (custom) {
      // Custom mode has no persona/scene to anchor to -- see
      // docs/custom-video-prompt-spec.md. HeyGen always needs a real
      // avatar_id, so there's no meaningful "custom" HeyGen request;
      // only Runway's pure text-to-video path applies.
      if (engine !== "runway") {
        return Response.json({ error: "Custom prompts are Runway-only for now." }, { status: 400 });
      }
      if (!acknowledged) {
        return Response.json(
          { error: "Check the content acknowledgment box before generating a custom prompt." },
          { status: 400 }
        );
      }
    } else if (!persona || !PERSONA_SCENES[persona]) {
      return Response.json({ error: "persona must be 'blaze', 'rendo', 'promptly', or 'synapse'." }, { status: 400 });
    }
    const resolvedScene = scene || DEFAULT_SCENE;
    if (!custom && !SCENE_IDS.includes(resolvedScene)) {
      return Response.json({ error: `scene must be one of: ${SCENE_IDS.join(", ")}.` }, { status: 400 });
    }
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json(
        { error: engine === "heygen" ? "Tell the persona what to say." : "Describe the motion you want." },
        { status: 400 }
      );
    }
    if (prompt.length > 500) {
      return Response.json({ error: "Keep the prompt under 500 characters." }, { status: 400 });
    }

    if (custom) {
      const modResult = await moderatePrompt(prompt.trim());
      if (modResult.flagged) {
        return Response.json(
          { error: `That prompt was rejected by content review${modResult.reason ? `: ${modResult.reason}` : "."}` },
          { status: 422 }
        );
      }
    }

    const baseCost = COST_USD[engine];
    const tierDiscount = await getStakedTierDiscount(address);
    const cost = Math.round(baseCost * (1 - tierDiscount) * 100) / 100;
    const balanceBeforeUsd = await getBalanceUsd(address);
    if (balanceBeforeUsd < cost) {
      return Response.json(
        {
          error: `This generation costs $${cost.toFixed(2)} of video credit${
            tierDiscount > 0 ? ` (${Math.round(tierDiscount * 100)}% staking-tier discount already applied)` : ""
          }; your balance is $${balanceBeforeUsd.toFixed(
            2
          )}. Burn more $INTERN on the video-credits page first.`,
        },
        { status: 402 }
      );
    }

    // Debited at submission, not confirmed success -- if the provider
    // call below throws (rejected request, network error, etc.), the
    // catch block refunds this exact amount before returning the error,
    // so a request that produced no video never leaves the balance
    // short. This does NOT touch REFUND_ON_FAILURE_IMPLEMENTED's real
    // remaining gap in videoCredits.js: a job that's accepted here but
    // fails later on the provider's side (after this function returns)
    // still isn't caught -- only failures at submission time are.
    const newBalanceUsd = await debitUsd(address, cost);

    let submitted;
    try {
      submitted =
        engine === "runway"
          ? await submitRunway(req, { persona, scene: resolvedScene, prompt: prompt.trim(), custom: Boolean(custom) })
          : await submitHeygen({ persona, scene: resolvedScene, prompt: prompt.trim() });
    } catch (submitErr) {
      const refundedBalanceUsd = await creditUsd(address, cost);
      console.error("[blaze] submission failed, refunded $" + cost.toFixed(2) + ":", submitErr);
      const status = submitErr.status || 500;
      return Response.json(
        {
          error: `${submitErr.message || "Couldn't start that generation."} Your $${cost.toFixed(
            2
          )} credit was refunded — balance is now $${refundedBalanceUsd.toFixed(2)}.`,
        },
        { status }
      );
    }

    // Recorded after a successful submit, not before -- a request that
    // never made it to the provider (validation error, insufficient
    // credit) has nothing worth showing in "your generations" yet.
    // Awaited (not fire-and-forget): a serverless function can be frozen
    // the instant it returns its response, so an un-awaited write here
    // could just never happen. A history-write failure is logged and
    // swallowed rather than failing the request -- the video itself
    // already submitted successfully, that's the part that must not be
    // lost over a secondary record.
    try {
      await recordGenerationStart({
        address,
        engine: submitted.engine,
        persona: custom ? null : persona,
        scene: custom ? null : resolvedScene,
        custom: Boolean(custom),
        prompt: prompt.trim(),
        taskId: submitted.taskId,
      });
    } catch (recordErr) {
      console.error("[blaze] recordGenerationStart failed (non-fatal):", recordErr);
    }

    return Response.json({ ...submitted, costUsd: cost, baseCostUsd: baseCost, tierDiscount, newBalanceUsd });
  } catch (err) {
    console.error("[blaze] generate error:", err);
    const status = err.status || 500;
    return Response.json({ error: err.message || "Something went wrong starting that generation." }, { status });
  }
}

// Polls the provider server-side so the raw Runway/HeyGen key never
// reaches the client -- the browser only ever sees this route's own
// normalized { status, videoUrl } shape.
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const engine = params.get("engine");
  const taskId = params.get("taskId");
  if (!taskId || (engine !== "runway" && engine !== "heygen")) {
    return Response.json({ error: "engine and taskId query params are required." }, { status: 400 });
  }

  try {
    let status, videoUrl;
    if (engine === "runway") {
      const res = await fetch(`${RUNWAY_BASE}/v1/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${process.env.RUNWAYML_API_SECRET}`,
          "X-Runway-Version": RUNWAY_VERSION,
        },
      });
      if (!res.ok) throw new Error(`Runway status check returned ${res.status}`);
      const data = await res.json();
      status = { PENDING: "queued", RUNNING: "processing", SUCCEEDED: "ready", FAILED: "failed" }[data.status] ?? "unknown";
      videoUrl = data.output?.[0] ?? null;
    } else {
      const res = await fetch(`${HEYGEN_BASE}/v1/video_status.get?video_id=${encodeURIComponent(taskId)}`, {
        headers: { "X-Api-Key": process.env.HEYGEN_API_KEY },
      });
      if (!res.ok) throw new Error(`HeyGen status check returned ${res.status}`);
      const data = await res.json();
      const raw = data.data?.status ?? data.status;
      status = { pending: "queued", processing: "processing", completed: "ready", failed: "failed" }[raw] ?? "unknown";
      videoUrl = data.data?.video_url ?? null;
    }

    // Only persist on a terminal state -- "queued"/"processing" gets
    // polled every 6s by the client and re-writing the same row that
    // often is pure waste. This is also the only place generations.videoUrl
    // (and the provider's own expiring link -- see videoCredits.js's
    // disclosed limitation) ever gets saved. Awaited, not fire-and-forget
    // -- same serverless-freeze-on-response reasoning as the POST handler.
    if (status === "ready" || status === "failed") {
      try {
        await updateGenerationStatus({ engine, taskId, status, videoUrl });
      } catch (updateErr) {
        console.error("[blaze] updateGenerationStatus failed (non-fatal):", updateErr);
      }
    }

    return Response.json({ status, videoUrl });
  } catch (err) {
    console.error("[blaze] status check error:", err);
    return Response.json({ error: "Couldn't check generation status right now." }, { status: 502 });
  }
}
