import { NextRequest, NextResponse } from "next/server";
import { softDeleteCustomer } from "@/lib/db-customers";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const { id } = await context.params;
  return NextResponse.json({ id, ...body });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const db = getDb();
  if (!db) {
    return NextResponse.json({ deleted: true, id, source: "mock" });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const ok = await softDeleteCustomer(orgId, id);
    if (!ok) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id, source: "db" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
