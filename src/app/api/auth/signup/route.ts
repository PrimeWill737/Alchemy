import { NextResponse } from "next/server";
import { z } from "zod";
import { getExtraByEmail, registerExtraAccount } from "@/lib/extra-accounts";
import { listStaticAccounts } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createDbSignupUser, hasDbAccount } from "@/lib/db-auth";
import { getActiveSignupPlanById } from "@/lib/db-signup-plans";
import { getAppName } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { welcomeSignupEmailHtml } from "@/lib/email/templates";
import { getFallbackSignupPlanById } from "@/lib/signup-plans-fallback";
import { formatSignupPlanQuotedForEmail } from "@/lib/signup-plan-quote";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  roleTitle: z.string().min(2),
  planId: z.string().uuid(),
  phone: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Please complete all required fields." }, { status: 400 });
  }

  const data = parsed.data;
  const email = data.email.trim().toLowerCase();
  const db = getDb();

  const plan = db ? await getActiveSignupPlanById(data.planId) : getFallbackSignupPlanById(data.planId);
  if (!plan) {
    return NextResponse.json(
      { success: false, message: "This plan is not available. Refresh the page and choose a current plan." },
      { status: 400 },
    );
  }
  const packageTier = plan.name;
  const packageCurrency = "NGN" as const;
  const packageAmount = plan.isCustomQuote ? 0 : (plan.amountNgn ?? 0);
  const quotedAmount = formatSignupPlanQuotedForEmail(plan);

  let exists = false;
  if (db) {
    exists = await hasDbAccount(email);
  } else {
    const existsInStatic = listStaticAccounts().some((acc) => acc.email.toLowerCase() === email);
    const existsInExtra = Boolean(getExtraByEmail(email));
    exists = existsInStatic || existsInExtra;
  }

  if (exists) {
    return NextResponse.json({ success: false, message: "An account with this email already exists." }, { status: 409 });
  }

  if (db) {
    await createDbSignupUser({
      fullName: data.fullName.trim(),
      email,
      password: data.password,
      companyName: data.companyName.trim(),
      roleTitle: data.roleTitle.trim(),
      packageTier,
      packageCurrency,
      packageAmount,
      phone: data.phone?.trim() || undefined,
      signupPlanId: plan.id,
      isMonthlyPlan: plan.billingInterval === "monthly",
    });
  } else {
    registerExtraAccount({
      email,
      password: data.password,
      displayName: data.fullName.trim(),
      userId: `u-extra-${crypto.randomUUID()}`,
      role: "admin",
      companyName: data.companyName.trim(),
      roleTitle: data.roleTitle.trim(),
      packageTier,
      packageCurrency,
      packageAmount,
      phone: data.phone?.trim() || undefined,
    });
  }

  await sendTransactionalEmail({
    to: email,
    subject: `Welcome to ${getAppName()}`,
    html: welcomeSignupEmailHtml({
      name: data.fullName.trim(),
      company: data.companyName.trim(),
      role: data.roleTitle.trim(),
      tier: packageTier,
      quotedAmount,
    }),
  });

  const message = db
    ? "Signup successful. Sign in, then open Billing to submit your bank transfer. A super admin must confirm payment before you can use the app."
    : "Signup successful. You can now sign in.";
  return NextResponse.json({ success: true, message }, { status: 201 });
}
