import { NextRequest, NextResponse } from "next/server";
import { canManageLeadSources } from "@/lib/rbac";
import { deleteLeadSource, updateLeadSourceName } from "@/lib/db-lead-sources";
import { getDb } from "@/lib/db";
import { getUserOrgAccess } from "@/lib/db-users";
import { getSessionFromRequest } from "@/lib/request-session";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getDb()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const access = await getUserOrgAccess(session.userId);
  if (!access || !canManageLeadSources(access.role, access.permissionLevel)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof (body as { name?: unknown })?.name === "string" ? (body as { name: string }).name : "";
  if (name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const updated = await updateLeadSourceName(access.organizationId, id, name);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ source: "db" as const, ...updated });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "A source with this name already exists" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getDb()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const access = await getUserOrgAccess(session.userId);
  if (!access || !canManageLeadSources(access.role, access.permissionLevel)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const ok = await deleteLeadSource(access.organizationId, id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ source: "db" as const, deleted: true, id });
}
