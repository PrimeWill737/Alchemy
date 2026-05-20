import { NextRequest, NextResponse } from "next/server";
import { mockDeals } from "@/lib/mock-db";
import { createDeal, listDeals } from "@/lib/db-deals";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import type { DealStage } from "@/types/crm";

const DEAL_STAGES: DealStage[] = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"];

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, deals: mockDeals });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, deals: mockDeals });
    }
    const deals = await listDeals(orgId);
    return NextResponse.json({ source: "db" as const, deals });
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
    title: string;
    customerId: string;
    value: number;
    stage: DealStage;
    closeDate: string;
    assignedTo: string;
  }>;

  if (!body.title?.trim() || body.value == null || Number.isNaN(Number(body.value))) {
    return NextResponse.json({ error: "Invalid deal payload" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    const deal = {
      id: `d-${crypto.randomUUID()}`,
      title: body.title.trim(),
      customerId: body.customerId ?? "",
      value: Number(body.value),
      stage: (body.stage && DEAL_STAGES.includes(body.stage) ? body.stage : "discovery") as DealStage,
      closeDate: body.closeDate ?? "",
      assignedTo: body.assignedTo ?? session.userId,
    };
    return NextResponse.json({ source: "mock" as const, deal }, { status: 201 });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const deal = await createDeal({
      organizationId: orgId,
      title: body.title.trim(),
      customerId: body.customerId,
      value: Number(body.value),
      stage: body.stage && DEAL_STAGES.includes(body.stage) ? body.stage : "discovery",
      closeDate: body.closeDate,
      assignedTo: body.assignedTo ?? session.userId,
      createdBy: session.userId,
    });
    return NextResponse.json({ source: "db" as const, deal }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
