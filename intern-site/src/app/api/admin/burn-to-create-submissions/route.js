import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../lib/adminAuth";
import { listBurnToCreateSubmissions } from "../../../lib/burnToCreateSubmissions";

export const runtime = "nodejs";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const submissions = await listBurnToCreateSubmissions();
    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("[admin/burn-to-create-submissions] GET failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
