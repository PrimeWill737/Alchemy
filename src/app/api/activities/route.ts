import { NextRequest, NextResponse } from "next/server";
import { mockActivities } from "@/lib/mock-db";
import { createActivity, listActivities } from "@/lib/db-activities";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import type { Activity, ActivityExportPurpose } from "@/types/crm";

const ACTIVITY_TYPES: Activity["type"][] = ["call", "email", "meeting", "note", "export"];
const EXPORT_PURPOSES: ActivityExportPurpose[] = ["sales_pipeline", "lead_funnel"];

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, activities: mockActivities });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, activities: mockActivities });
    }
    const activities = await listActivities(orgId);
    return NextResponse.json({ source: "db" as const, activities });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<Activity>;
  if (!body.type || !ACTIVITY_TYPES.includes(body.type) || !body.description?.trim()) {
    return NextResponse.json({ error: "Invalid activity payload" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    const activity: Activity = {
      id: body.id ?? `a-${crypto.randomUUID()}`,
      type: body.type,
      description: body.description.trim(),
      userId: body.userId ?? session.userId,
      createdAt: body.createdAt ?? new Date().toISOString().slice(0, 10),
      supervisingAdminId: body.supervisingAdminId,
      exportPurpose:
        body.exportPurpose && EXPORT_PURPOSES.includes(body.exportPurpose)
          ? body.exportPurpose
          : undefined,
    };
    return NextResponse.json({ source: "mock" as const, activity }, { status: 201 });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const activity = await createActivity({
      organizationId: orgId,
      type: body.type,
      description: body.description.trim(),
      userId: body.userId ?? session.userId,
      exportPurpose:
        body.exportPurpose && EXPORT_PURPOSES.includes(body.exportPurpose)
          ? body.exportPurpose
          : undefined,
    });
    return NextResponse.json({ source: "db" as const, activity }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
