import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, query } from "@/lib/db";
import { getUserOrgAccess } from "@/lib/db-users";
import {
  getSubscriptionBillingUiFlags,
  getSubscriptionByOrganizationId,
  subscriptionRecordGrantsAppAccess,
  syncSubscriptionLifecycleForOrganization,
  utcDateString,
} from "@/lib/db-subscriptions";
import { getSessionFromRequest } from "@/lib/request-session";
import { getSignupPlanFeatureLinesById } from "@/lib/db-signup-plans";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getDb()) {
    return NextResponse.json({ hasAccess: true, mode: "demo" as const });
  }

  if (session.role === "super_admin") {
    return NextResponse.json({ hasAccess: true, mode: "super_admin" as const });
  }

  let access = await getUserOrgAccess(session.userId);
  if (!access) {
    return NextResponse.json({ hasAccess: false, deactivated: true as const }, { status: 200 });
  }

  await syncSubscriptionLifecycleForOrganization(access.organizationId);

  access = await getUserOrgAccess(session.userId);
  if (!access) {
    return NextResponse.json({ hasAccess: false, deactivated: true as const }, { status: 200 });
  }

  const sub = await getSubscriptionByOrganizationId(access.organizationId);
  if (!sub) {
    return NextResponse.json({
      hasAccess: true,
      legacyWorkspace: true as const,
    });
  }

  const { rows: todayRows } = await query<{ d: string }>(`SELECT CURRENT_DATE::text AS d`);
  const today = todayRows[0]?.d ?? utcDateString();

  const hasAccess = subscriptionRecordGrantsAppAccess(sub, today);
  const billing = getSubscriptionBillingUiFlags(sub, today);
  const planBenefits = await getSignupPlanFeatureLinesById(sub.signupPlanId);

  return NextResponse.json({
    hasAccess,
    subscription: {
      id: sub.id,
      status: sub.status,
      planName: sub.planNameSnapshot,
      amountNgn: sub.amountNgn,
      isMonthly: sub.isMonthly,
      periodStart: sub.periodStart,
      periodEnd: sub.periodEnd,
      transferReference: sub.transferReference,
      planBenefits,
    },
    billing,
  });
}
