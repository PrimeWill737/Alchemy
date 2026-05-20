import { NextRequest, NextResponse } from "next/server";
import { getReportsSummary } from "@/lib/db-reports";
import { getMockReportsSummary } from "@/lib/crm-mock-reports";
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
    return NextResponse.json({ source: "mock" as const, ...getMockReportsSummary() });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, ...getMockReportsSummary() });
    }
    const summary = await getReportsSummary(orgId);
    return NextResponse.json({ source: "db" as const, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
