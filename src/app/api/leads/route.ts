import { NextRequest, NextResponse } from "next/server";
import { mockLeads } from "@/lib/mock-db";
import { createLead, listLeads } from "@/lib/db-leads";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import type { LeadStatus } from "@/types/crm";

const LEAD_STATUSES: LeadStatus[] = ["new", "qualified", "proposal", "won", "lost"];

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, leads: mockLeads });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, leads: mockLeads });
    }
    const leads = await listLeads(orgId);
    return NextResponse.json({ source: "db" as const, leads });
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
  const body = (await request.json()) as Partial<{
    name: string;
    source: string;
    value: number;
    status: LeadStatus;
    assignedTo: string;
  }>;

  if (!body.name?.trim() || !body.source?.trim() || body.value == null || Number.isNaN(Number(body.value))) {
    return NextResponse.json({ error: "Invalid lead payload" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    const lead = {
      id: `l-${crypto.randomUUID()}`,
      name: body.name.trim(),
      source: body.source.trim(),
      value: Number(body.value),
      status: (body.status && LEAD_STATUSES.includes(body.status) ? body.status : "new") as LeadStatus,
      assignedTo: body.assignedTo ?? session.userId,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    return NextResponse.json({ source: "mock" as const, lead }, { status: 201 });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const lead = await createLead({
      organizationId: orgId,
      name: body.name.trim(),
      source: body.source.trim(),
      value: Number(body.value),
      status: body.status && LEAD_STATUSES.includes(body.status) ? body.status : "new",
      assignedTo: body.assignedTo ?? session.userId,
      createdBy: session.userId,
    });
    return NextResponse.json({ source: "db" as const, lead }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
