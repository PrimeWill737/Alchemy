import { NextRequest, NextResponse } from "next/server";
import { mockCustomers } from "@/lib/mock-db";
import { createCustomer, listCustomers } from "@/lib/db-customers";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, customers: mockCustomers });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, customers: mockCustomers });
    }
    const customers = await listCustomers(orgId);
    return NextResponse.json({ source: "db" as const, customers });
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
    email: string;
    phone: string;
    company: string;
    assignedTo: string;
    supervisingAdminId?: string;
    createdByUserId?: string;
  }>;

  if (!body.name?.trim() || !body.email?.trim() || !body.assignedTo) {
    return NextResponse.json({ error: "Invalid customer payload" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    const customer = {
      id: `c-${crypto.randomUUID()}`,
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() ?? "",
      company: body.company?.trim() ?? "",
      status: "active" as const,
      assignedTo: body.assignedTo,
      createdAt: new Date().toISOString().slice(0, 10),
      createdByUserId: body.createdByUserId ?? session.userId,
      supervisingAdminId: body.supervisingAdminId,
    };
    return NextResponse.json({ source: "mock" as const, customer }, { status: 201 });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const customer = await createCustomer({
      organizationId: orgId,
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() ?? "",
      company: body.company?.trim() ?? "",
      assignedTo: body.assignedTo,
      createdBy: body.createdByUserId ?? session.userId,
    });
    return NextResponse.json({ source: "db" as const, customer }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
