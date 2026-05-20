import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDefaultOrganizationId, updateUserDisplayCurrency } from "@/lib/db-users";
import { getSessionFromRequest } from "@/lib/request-session";
import { isDisplayCurrencyCode } from "@/lib/display-currencies";
import { isUuid } from "@/lib/uuid";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId: targetId } = await context.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { displayCurrency?: unknown } | null;
  if (!body || !isDisplayCurrencyCode(body.displayCurrency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const db = getDb();
  if (db && !isUuid(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ success: true, displayCurrency: body.displayCurrency });
  }

  try {
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "Organization not configured" }, { status: 400 });
    }
    const user = await updateUserDisplayCurrency(orgId, targetId, body.displayCurrency);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, displayCurrency: user.displayCurrency ?? body.displayCurrency });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
