import { isAddress } from "viem";
import { listGenerationsForAddress } from "../../../lib/videoCredits";

// Backs "your generations" on the video-credits page -- read-only list
// of what this wallet has generated, newest first. See
// videoCredits.js's own disclosed limitation: videoUrl is whatever the
// provider (Runway/HeyGen) returned, and that link has been observed to
// expire (a signed CloudFront URL on the very first real generation
// through this feature carried roughly a 1-day expiry) -- this route
// doesn't re-check or refresh those links, it returns exactly what was
// saved at generation time.
export async function GET(req) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address || !isAddress(address)) {
    return Response.json({ error: "A valid address is required." }, { status: 400 });
  }
  const generations = await listGenerationsForAddress(address);
  return Response.json({
    generations: generations.map((g) => ({
      id: String(g._id),
      engine: g.engine,
      persona: g.persona,
      scene: g.scene,
      custom: g.custom,
      prompt: g.prompt,
      status: g.status,
      videoUrl: g.videoUrl,
      createdAt: g.createdAt,
    })),
  });
}
