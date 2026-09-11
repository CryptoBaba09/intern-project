import { getDb } from "./mongodb";

// Blaze v1: video-credit ledger for the "burn $INTERN -> generate real
// video on-site" flow, PLUS a generation-history record (see
// recordGenerationStart/updateGenerationStatus/listGenerationsForAddress
// below) that backs "view/download your own generations later."
//
// Was an in-memory Map until 2026-09-11 -- real bug found live: two
// custom-prompt generations failed due to a Runway router-config issue,
// and the credit spent on them was gone the moment the next deploy
// cold-started the process, because nothing survived between server
// instances. Persisted to MongoDB now (see lib/mongodb.js) specifically
// to fix that class of bug, not just this one instance of it.
//
// Collections, database "intern":
//   videoCredits  { _id: address.toLowerCase(), balanceUsd: Number }
//   redeemedBurns { _id: txHash.toLowerCase(), redeemedAt: Date }
//   generations   { _id, address, engine, persona, scene, custom, prompt,
//                   taskId, status: "pending"|"ready"|"failed",
//                   videoUrl, createdAt, updatedAt }
//
// generations.videoUrl is whatever URL the provider (Runway/HeyGen)
// handed back -- DISCLOSED LIMITATION: that URL has been observed to
// carry a short-lived signed-JWT expiry (Runway's own CloudFront link
// for the first real generation through this feature expired within
// about a day). "View/download later" is only as durable as that
// upstream URL until this re-hosts the actual video bytes to permanent
// storage (Vercel Blob is the natural fit, not built yet) -- flagged
// here rather than silently promising permanence this doesn't have yet.

export async function isBurnRedeemed(txHash) {
  const db = await getDb();
  const doc = await db.collection("redeemedBurns").findOne({ _id: txHash.toLowerCase() });
  return Boolean(doc);
}

export async function markBurnRedeemed(txHash) {
  const db = await getDb();
  await db
    .collection("redeemedBurns")
    .updateOne({ _id: txHash.toLowerCase() }, { $set: { redeemedAt: new Date() } }, { upsert: true });
}

export async function getBalanceUsd(address) {
  const db = await getDb();
  const doc = await db.collection("videoCredits").findOne({ _id: address.toLowerCase() });
  return doc?.balanceUsd ?? 0;
}

export async function creditUsd(address, amountUsd) {
  const db = await getDb();
  const key = address.toLowerCase();
  const result = await db
    .collection("videoCredits")
    .findOneAndUpdate(
      { _id: key },
      { $inc: { balanceUsd: amountUsd } },
      { upsert: true, returnDocument: "after" }
    );
  return result?.balanceUsd ?? result?.value?.balanceUsd ?? amountUsd;
}

// Throws rather than silently flooring at 0 -- callers must check
// getBalanceUsd() first and surface an honest "insufficient credit"
// error instead of letting a debit go negative. Not a race-safe
// check-then-set (two concurrent requests from the same wallet could
// both pass the check) -- acceptable for a single-user-at-a-time beta
// UI, a real gap if this ever needs to be concurrency-safe.
export async function debitUsd(address, amountUsd) {
  const db = await getDb();
  const key = address.toLowerCase();
  const doc = await db.collection("videoCredits").findOne({ _id: key });
  const current = doc?.balanceUsd ?? 0;
  if (current < amountUsd) {
    throw new Error("Insufficient video credit.");
  }
  const result = await db
    .collection("videoCredits")
    .findOneAndUpdate({ _id: key }, { $inc: { balanceUsd: -amountUsd } }, { returnDocument: "after" });
  return result?.balanceUsd ?? result?.value?.balanceUsd ?? current - amountUsd;
}

// api/blaze/generate's POST handler refunds via creditUsd() when the
// Runway/HeyGen submit call itself throws (rejected request, provider
// outage, etc.) -- see the "no_eligible_model" bug this closed on
// 2026-09-11, where a broken router config debited a user's credit for
// a generation that never ran.
//
// Real remaining gap: a job that's ACCEPTED at submission but fails
// later on the provider's own side (after that route already returned
// 200) is NOT refunded -- needs a job-status webhook this codebase
// doesn't have yet.
export const REFUND_ON_FAILURE_IMPLEMENTED = "submission-time only";

// --- Generation history (view/download later; also the foundation for
// a future public gallery -- see docs/generation-gallery-spec.md) ---

export async function recordGenerationStart({ address, engine, persona, scene, custom, prompt, taskId }) {
  const db = await getDb();
  const doc = {
    address: address.toLowerCase(),
    engine,
    persona: persona ?? null,
    scene: scene ?? null,
    custom: Boolean(custom),
    prompt,
    taskId,
    status: "pending",
    videoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.collection("generations").insertOne(doc);
  return result.insertedId;
}

// Looked up by (engine, taskId) rather than the Mongo _id, because the
// status-poll route only ever has the provider's taskId, the same
// identifier the client polls with.
export async function updateGenerationStatus({ engine, taskId, status, videoUrl }) {
  const db = await getDb();
  await db
    .collection("generations")
    .updateOne(
      { engine, taskId },
      { $set: { status, videoUrl: videoUrl ?? null, updatedAt: new Date() } }
    );
}

export async function listGenerationsForAddress(address, limit = 50) {
  const db = await getDb();
  return db
    .collection("generations")
    .find({ address: address.toLowerCase() })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
