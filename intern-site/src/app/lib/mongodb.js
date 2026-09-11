import { MongoClient } from "mongodb";

// Real persistent store for the video-credit ledger + generation
// history -- replaces the in-memory Map that used to live in
// videoCredits.js (see git history, and docs/persistent-video-credits-spec.md
// for why: every deploy or cold start wiped every wallet's balance,
// which is not survivable for a feature that charges real burned
// $INTERN for it).
//
// Standard Next.js-on-serverless pattern: cache the client (and the
// in-flight connect promise) on `global` so hot reloads in dev and
// repeated warm invocations in production reuse one connection instead
// of opening a new one per request. A cold serverless instance still
// pays for one real connect -- that's unavoidable without a shared
// connection pooler in front of Atlas, not a bug in this file.
const options = {};

let clientPromise;

// Deliberately lazy: the client is created (and MONGODB_URI checked) on
// first real use, not at module-import time. Next.js's build statically
// imports every API route's module graph to "collect page data" -- a
// top-level throw here used to abort the ENTIRE `next build` the moment
// MONGODB_URI was missing, even for routes that never touch the
// database. Confirmed the hard way: the first-ever Preview deployment
// (2026-09-11, unrelated migrate-UI branch) failed outright because
// MONGODB_URI is only configured for Production. Deferring to getDb()
// means importing this file is always safe; only an actual attempt to
// read/write the ledger fails if the var is missing -- the same "fails
// closed at the point of use" style already used elsewhere in this
// codebase (e.g. getStakedTierDiscount), not a build-time landmine.
function getClientPromise() {
  if (clientPromise) return clientPromise;

  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI isn't set -- the video-credit ledger and generation history have no database to write to. Set it in Vercel's Environment Variables."
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(process.env.MONGODB_URI, options).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(process.env.MONGODB_URI, options).connect();
  }
  return clientPromise;
}

// Database name is explicit in the connection string's path segment
// (see MONGODB_URI in Vercel) -- db() with no argument would fall back
// to "test", which is almost never what you want and easy to miss.
export async function getDb() {
  const connectedClient = await getClientPromise();
  return connectedClient.db("intern");
}
