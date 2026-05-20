import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getUserOrgAccess } from "@/lib/db-users";
import {
  getSubscriptionNotifyContext,
  submitSubscriptionPaymentRequest,
} from "@/lib/db-subscriptions";
import { sendTransactionalEmail } from "@/lib/email/send";
import { subscriptionPaymentNotifySuperAdminHtml } from "@/lib/email/templates";
import { getAppName, getAppPublicUrl, getSubscriptionNotifyEmail } from "@/lib/email/env";
import { getSessionFromRequest } from "@/lib/request-session";

const bodySchema = z.object({
  transferReference: z.string().min(2).max(500),
});

function formatAmountLabel(amountNgn: number): string {
  if (!amountNgn || amountNgn <= 0) return "Custom / per agreement (NGN)";
  return `₦${amountNgn.toLocaleString("en-NG")}`;
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getDb()) {
    return NextResponse.json({ error: "Billing requires database mode" }, { status: 503 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only workspace admins can submit payment" }, { status: 403 });
  }

  const access = await getUserOrgAccess(session.userId);
  if (!access) {
    return NextResponse.json({ error: "Account not found" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a transfer reference or note (at least 2 characters)." }, { status: 400 });
  }

  const result = await submitSubscriptionPaymentRequest({
    organizationId: access.organizationId,
    transferReference: parsed.data.transferReference,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "No payment step is available for your current subscription state." },
      { status: 400 },
    );
  }

  const ctx = await getSubscriptionNotifyContext(access.organizationId);
  if (ctx) {
    const templateKind = result.notifyKind === "initial" ? "initial" : "resubscribe";
    await sendTransactionalEmail({
      to: getSubscriptionNotifyEmail(),
      subject:
        result.notifyKind === "initial"
          ? `Confirm new workspace payment — ${getAppName()}`
          : `Confirm renewal payment — ${getAppName()}`,
      html: subscriptionPaymentNotifySuperAdminHtml({
        kind: templateKind,
        organizationName: ctx.organizationName,
        billingContactName: ctx.billingContactName,
        billingContactEmail: ctx.billingContactEmail,
        planName: ctx.planName,
        amountLabel: formatAmountLabel(ctx.amountNgn),
        transferReference: parsed.data.transferReference.trim(),
        controlCenterUrl: `${getAppPublicUrl()}/settings`,
      }),
    });
  }

  return NextResponse.json({ success: true });
}
