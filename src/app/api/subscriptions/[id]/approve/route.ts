import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { approveSubscriptionById, getSubscriptionById } from "@/lib/db-subscriptions";
import { getSessionFromRequest } from "@/lib/request-session";
import { isUuid } from "@/lib/uuid";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getDb()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id?.trim() || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });
  }

  const existing = await getSubscriptionById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await approveSubscriptionById(id);
  if (!updated) {
    return NextResponse.json(
      { error: "Only subscriptions awaiting confirmation can be approved." },
      { status: 400 },
    );
  }

  return NextResponse.json({ subscription: updated });
}
