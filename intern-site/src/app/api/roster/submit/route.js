import { NextResponse } from "next/server";
import { submitRosterIdea, countRosterSubmissions } from "../../../lib/rosterSubmissions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const count = await countRosterSubmissions();
    return NextResponse.json({ count });
  } catch (err) {
    // Same "fail closed at the point of use" style as lib/mongodb.js --
    // a missing MONGODB_URI on a preview deployment shouldn't 500 the
    // whole page, just report an unknown count.
    console.error("[roster/submit] GET failed:", err.message);
    return NextResponse.json({ count: null });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await submitRosterIdea(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err.message.includes("required") ? 400 : 500;
    console.error("[roster/submit] POST failed:", err.message);
    return NextResponse.json({ error: err.message }, { status });
  }
}
