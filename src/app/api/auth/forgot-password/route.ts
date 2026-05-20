import { NextResponse } from "next/server";
import { z } from "zod";
import { canRequestPasswordReset } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasDbAccount, issueDbPasswordResetOtp } from "@/lib/db-auth";
import { issueOtp } from "@/lib/otp-store";
import { getAppName } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { otpEmailHtml } from "@/lib/email/templates";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Provide a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();
  const exists = db ? await hasDbAccount(email) : canRequestPasswordReset(email);

  if (exists) {
    const code = issueOtp(email);
    if (db) {
      await issueDbPasswordResetOtp(email, code);
    }
    await sendTransactionalEmail({
      to: email,
      subject: `Your ${getAppName()} password reset code`,
      html: otpEmailHtml(code),
    });
  }

  return NextResponse.json({
    success: true,
    message: "If that email exists, a verification code has been sent.",
  });
}
