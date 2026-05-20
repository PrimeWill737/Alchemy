import { NextRequest, NextResponse } from "next/server";
import { canManageLeadSources } from "@/lib/rbac";
import { createLeadSource, listLeadSources } from "@/lib/db-lead-sources";
import { getDb } from "@/lib/db";
import { getUserOrgAccess } from "@/lib/db-users";
import { getSessionFromRequest } from "@/lib/request-session";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getDb()) {
    return NextResponse.json({ source: "none" as const });
  }
  const access = await getUserOrgAccess(session.userId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sources = await listLeadSources(access.organizationId);
  return NextResponse.json({ source: "db" as const, sources });
}

export async function POST(request: NextRequest) {
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
    const sourceEntry = await createLeadSource(access.organizationId, name);
    return NextResponse.json({ source: "db" as const, sourceEntry }, { status: 201 });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "A source with this name already exists" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
