import { getDb } from "./mongodb";

// "Roster Call" -- community submissions for the next intern persona.
// Same database ("intern") and lazy-getDb() pattern as videoCredits.js,
// new collection since this isn't a credit ledger.
//
// Collection, database "intern":
//   rosterSubmissions { _id: ObjectId, role, pitch, submitterName,
//                        wallet, createdAt }
//
// DISCLOSED LIMITATION, matching this feature's own page copy: storage
// is real, but payout isn't automatic. Treasury picks winners and pays
// $INTERN by hand -- no contract reads this collection. Don't let that
// drift into an implied "submit and get paid automatically" claim
// anywhere this is surfaced.
const MAX_LEN = { role: 80, pitch: 500, submitterName: 60 };

export async function submitRosterIdea({ role, pitch, submitterName, wallet }) {
  const cleanRole = String(role || "").trim().slice(0, MAX_LEN.role);
  const cleanPitch = String(pitch || "").trim().slice(0, MAX_LEN.pitch);
  const cleanName = String(submitterName || "").trim().slice(0, MAX_LEN.submitterName);
  const cleanWallet = wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet.trim()) ? wallet.trim().toLowerCase() : null;

  if (!cleanRole || !cleanPitch) {
    throw new Error("role and pitch are required");
  }

  const db = await getDb();
  await db.collection("rosterSubmissions").insertOne({
    role: cleanRole,
    pitch: cleanPitch,
    submitterName: cleanName || null,
    wallet: cleanWallet,
    createdAt: new Date(),
  });
}

export async function countRosterSubmissions() {
  const db = await getDb();
  return db.collection("rosterSubmissions").countDocuments();
}

// Admin-only read -- see /api/admin/roster-submissions. Newest first,
// capped at 500 so this never turns into an unbounded query as
// submissions grow.
export async function listRosterSubmissions() {
  const db = await getDb();
  const docs = await db
    .collection("rosterSubmissions")
    .find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    role: d.role,
    pitch: d.pitch,
    submitterName: d.submitterName,
    wallet: d.wallet,
    createdAt: d.createdAt,
  }));
}
