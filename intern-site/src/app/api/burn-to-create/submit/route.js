import { NextResponse } from "next/server";
import {
  submitBurnToCreateEntry,
  countBurnToCreateSubmissions,
} from "../../../lib/burnToCreateSubmissions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const count = await countBurnToCreateSubmissions();
    return NextResponse.json({ count });
  } catch (err) {
    console.error("[burn-to-create/submit] GET failed:", err.message);
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
    await submitBurnToCreateEntry(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err.message.includes("required") ? 400 : 500;
    console.error("[burn-to-create/submit] POST failed:", err.message);
    return NextResponse.json({ error: err.message }, { status });
  }
}
