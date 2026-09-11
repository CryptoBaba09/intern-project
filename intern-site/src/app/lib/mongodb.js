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
if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI isn't set -- the video-credit ledger and generation history have no database to write to. Set it in Vercel's Environment Variables."
  );
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Database name is explicit in the connection string's path segment
// (see MONGODB_URI in Vercel) -- db() with no argument would fall back
// to "test", which is almost never what you want and easy to miss.
export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db("intern");
}
