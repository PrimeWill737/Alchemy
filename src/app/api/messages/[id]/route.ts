import { NextRequest, NextResponse } from "next/server";
import { updateMessageStatus } from "@/lib/db-messages";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import type { InboxMessageStatus } from "@/types/crm";

const STATUSES: InboxMessageStatus[] = ["open", "responded", "closed"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json()) as { status?: InboxMessageStatus };
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, id, status: body.status });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const message = await updateMessageStatus(orgId, id, body.status);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ source: "db" as const, message });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
