import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, query } from "@/lib/db";
import { getUserOrgAccess } from "@/lib/db-users";
import {
  cancelSubscriptionForOrganization,
  getSubscriptionByOrganizationId,
} from "@/lib/db-subscriptions";
import { getAppName } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { subscriptionCancelledUserEmailHtml } from "@/lib/email/templates";
import { getSessionFromRequest } from "@/lib/request-session";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getDb()) {
    return NextResponse.json({ error: "Billing requires database mode" }, { status: 503 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only workspace admins can cancel" }, { status: 403 });
  }

  const access = await getUserOrgAccess(session.userId);
  if (!access) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 });
  }

  const sub = await getSubscriptionByOrganizationId(access.organizationId);
  if (!sub) {
    return NextResponse.json({ error: "No subscription" }, { status: 404 });
  }

  let contact: { name: string; email: string } | null = null;
  if (sub.billingContactUserId) {
    const { rows } = await query<{ name: string; email: string }>(
      `SELECT name, email FROM users WHERE id = $1 LIMIT 1`,
      [sub.billingContactUserId],
    );
    contact = rows[0] ?? null;
  }

  const ok = await cancelSubscriptionForOrganization(access.organizationId);
  if (!ok) {
    return NextResponse.json({ error: "Subscription cannot be cancelled in its current state." }, { status: 400 });
  }

  if (contact) {
    await sendTransactionalEmail({
      to: contact.email,
      subject: `Your ${getAppName()} subscription was cancelled`,
      html: subscriptionCancelledUserEmailHtml({ name: contact.name }),
    });
  }

  return NextResponse.json({ success: true });
}
