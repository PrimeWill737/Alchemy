import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listActiveSignupPlansForPublic } from "@/lib/db-signup-plans";
import { listFallbackSignupPlansActive } from "@/lib/signup-plans-fallback";

export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "fallback" as const, plans: listFallbackSignupPlansActive() });
  }
  try {
    const plans = await listActiveSignupPlansForPublic();
    return NextResponse.json({ source: "db" as const, plans });
  } catch {
    return NextResponse.json({ source: "error" as const, plans: [] }, { status: 503 });
  }
}
