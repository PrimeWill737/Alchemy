import { NextRequest, NextResponse } from "next/server";
import { softDeleteLead, updateLeadStatus } from "@/lib/db-leads";
import { getUserOrgAccess } from "@/lib/db-users";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import { canDeleteLead, canUpdateLeadStatus, hasPermission } from "@/lib/rbac";
import type { LeadStatus } from "@/types/crm";

const LEAD_STATUSES: LeadStatus[] = ["new", "qualified", "proposal", "won", "lost"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.role, "manage:leads")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const access = db ? await getUserOrgAccess(session.userId) : null;
  const permissionLevel = access?.permissionLevel ?? (!db ? "standard" : undefined);
  if (!canUpdateLeadStatus(session.role, permissionLevel)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { status?: LeadStatus };
  if (!body.status || !LEAD_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ source: "mock" as const, id, status: body.status });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const lead = await updateLeadStatus(orgId, id, body.status);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ source: "db" as const, lead });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const access = db ? await getUserOrgAccess(session.userId) : null;
  const permissionLevel = access?.permissionLevel ?? (!db ? "standard" : undefined);
  if (!canDeleteLead(session.role, permissionLevel)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!db) {
    return NextResponse.json({ deleted: true, id, source: "mock" });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const ok = await softDeleteLead(orgId, id);
    if (!ok) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id, source: "db" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
