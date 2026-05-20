import { NextRequest, NextResponse } from "next/server";
import { mockUsers } from "@/lib/mock-db";
import { getDb, query } from "@/lib/db";
import { getDefaultOrganizationId, updateUserDisplayCurrency } from "@/lib/db-users";
import { getSessionFromRequest } from "@/lib/request-session";
import { DEFAULT_DISPLAY_CURRENCY, isDisplayCurrencyCode } from "@/lib/display-currencies";

function mockDisplayCurrency(userId: string): string {
  return mockUsers.find((u) => u.id === userId)?.displayCurrency ?? DEFAULT_DISPLAY_CURRENCY;
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ displayCurrency: mockDisplayCurrency(session.userId) });
  }

  try {
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return NextResponse.json({ displayCurrency: mockDisplayCurrency(session.userId) });
    }
    const { rows } = await query<{ display_currency: string }>(
      `SELECT display_currency FROM users WHERE id = $1 AND organization_id = $2 AND is_active = TRUE`,
      [session.userId, orgId],
    );
    return NextResponse.json({ displayCurrency: rows[0]?.display_currency ?? DEFAULT_DISPLAY_CURRENCY });
  } catch {
    return NextResponse.json({ displayCurrency: DEFAULT_DISPLAY_CURRENCY });
  }
}

export async function PATCH(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { displayCurrency?: unknown } | null;
  if (!body || !isDisplayCurrencyCode(body.displayCurrency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ success: true, displayCurrency: body.displayCurrency });
  }

  try {
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "Organization not configured" }, { status: 400 });
    }
    const user = await updateUserDisplayCurrency(orgId, session.userId, body.displayCurrency);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, displayCurrency: user.displayCurrency ?? body.displayCurrency });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
