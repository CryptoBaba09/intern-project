import { getDb } from "./mongodb";

// Burn to Create, Round 2 -- same real-form/real-database pattern as
// rosterSubmissions.js, new collection since this tracks contest
// entries, not persona pitches.
//
// Collection, database "intern":
//   burnToCreateSubmissions { _id, videoLink, wallet, note, createdAt }
//
// DISCLOSED LIMITATION, matching this feature's own page copy: winners
// get a treasury-funded video-credit top-up, picked by hand -- nothing
// here pays out automatically, and no fixed prize amount is promised.
const MAX_LEN = { videoLink: 500, note: 300 };

export async function submitBurnToCreateEntry({ videoLink, wallet, note }) {
  const cleanLink = String(videoLink || "").trim().slice(0, MAX_LEN.videoLink);
  const cleanNote = String(note || "").trim().slice(0, MAX_LEN.note);
  const cleanWallet = wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet.trim()) ? wallet.trim().toLowerCase() : null;

  if (!cleanLink || !cleanWallet) {
    throw new Error("videoLink and wallet are required");
  }

  const db = await getDb();
  await db.collection("burnToCreateSubmissions").insertOne({
    videoLink: cleanLink,
    wallet: cleanWallet,
    note: cleanNote || null,
    createdAt: new Date(),
  });
}

export async function countBurnToCreateSubmissions() {
  const db = await getDb();
  return db.collection("burnToCreateSubmissions").countDocuments();
}

export async function listBurnToCreateSubmissions() {
  const db = await getDb();
  const docs = await db
    .collection("burnToCreateSubmissions")
    .find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    videoLink: d.videoLink,
    wallet: d.wallet,
    note: d.note,
    createdAt: d.createdAt,
  }));
}
