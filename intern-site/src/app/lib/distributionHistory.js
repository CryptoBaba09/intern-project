import { getDb } from "./mongodb";

// Real distribution history for the staking APY stat (see /stake and
// /api/stake/apy). Same database ("intern") and lazy-getDb() pattern as
// rosterSubmissions.js/videoCredits.js, new collection since this isn't
// a credit ledger either.
//
// Collection, database "intern":
//   distributionHistory { _id: ObjectId, beDistributedWei: string,
//                          totalStakedWei: string, recordedAt }
//
// Nothing recorded any of this before this file existed -- the
// burn-and-distribute cron computed and sent BE to the distributor
// every cycle but never wrote down how much. Recording starts from
// whenever this first ships; there's no historical backfill (see
// api/stake/apy/route.js for how it handles a thin or empty history
// honestly rather than faking a number).
//
// Amounts are recorded as strings, not numbers -- these are wei-scale
// bigints (up to 18 decimals), and JS numbers lose precision well
// before that.
export async function recordDistribution({ beDistributedWei, totalStakedWei }) {
  const db = await getDb();
  await db.collection("distributionHistory").insertOne({
    beDistributedWei: beDistributedWei.toString(),
    totalStakedWei: totalStakedWei.toString(),
    recordedAt: new Date(),
  });
}

// Newest first, capped at 500 -- same bound as listRosterSubmissions,
// and this only ever grows by one document per cron cycle (currently
// daily), so 500 is years of headroom regardless of how the schedule
// changes later.
export async function listDistributions() {
  const db = await getDb();
  const docs = await db
    .collection("distributionHistory")
    .find({})
    .sort({ recordedAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((d) => ({
    beDistributedWei: d.beDistributedWei,
    totalStakedWei: d.totalStakedWei,
    recordedAt: d.recordedAt,
  }));
}
