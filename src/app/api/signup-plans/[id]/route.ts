import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/request-session";
import { deleteSignupPlan, updateSignupPlan } from "@/lib/db-signup-plans";
import { isUuid } from "@/lib/uuid";
import { signupPlanUpsertSchema } from "@/lib/signup-plans-payload";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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
  const { id } = await context.params;
  if (!id?.trim() || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
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
    const plan = await updateSignupPlan(id, {
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
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "23505") {
      return NextResponse.json({ error: "A plan with this slug already exists" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = getSessionFromRequest(_request);
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
  const { id } = await context.params;
  if (!id?.trim() || !isUuid(id)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }
  try {
    const ok = await deleteSignupPlan(id);
    if (!ok) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
