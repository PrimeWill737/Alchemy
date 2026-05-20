import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/request-session";
import { insertSignupPlan, listAllSignupPlansForAdmin } from "@/lib/db-signup-plans";
import { signupPlanUpsertSchema } from "@/lib/signup-plans-payload";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    const plans = await listAllSignupPlansForAdmin();
    return NextResponse.json({ plans });
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
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const raw = await request.json().catch(() => null);
  const parsed = signupPlanUpsertSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first =
      flat.fieldErrors.slug?.[0] ??
      flat.fieldErrors.name?.[0] ??
      flat.fieldErrors.amountNgn?.[0] ??
      flat.formErrors[0];
    return NextResponse.json(
      { error: first ?? "Invalid payload", details: flat },
      { status: 400 },
    );
  }
  const body = parsed.data;
  try {
    const plan = await insertSignupPlan({
      name: body.name,
      slug: body.slug,
      amountNgn: body.isCustomQuote ? null : body.amountNgn,
      priceSuffix: body.priceSuffix,
      featureLines: body.featureLines,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      isCustomQuote: body.isCustomQuote,
      billingInterval: body.billingInterval,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "A plan with this slug already exists" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
