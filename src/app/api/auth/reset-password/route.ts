import { NextResponse } from "next/server";
import { z } from "zod";
import { canRequestPasswordReset } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hasDbAccount, updateDbPassword, verifyAndConsumeDbOtp } from "@/lib/db-auth";
import { clearOtp, verifyOtp } from "@/lib/otp-store";
import { updateExtraPassword } from "@/lib/extra-accounts";
import { setPasswordOverride } from "@/lib/password-overrides";
import { getAppName } from "@/lib/email/env";
import { passwordResetSuccessEmailHtml } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/send";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid reset payload." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();
  const exists = db ? await hasDbAccount(email) : canRequestPasswordReset(email);
  if (!exists) {
    return NextResponse.json({ success: false, message: "Unable to process reset request." }, { status: 400 });
  }

  const otpOk = db
    ? await verifyAndConsumeDbOtp(email, parsed.data.otp)
    : verifyOtp(email, parsed.data.otp);
  if (!otpOk) {
    return NextResponse.json({ success: false, message: "Invalid or expired OTP." }, { status: 400 });
  }

  if (db) {
    const updated = await updateDbPassword(email, parsed.data.newPassword);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Unable to update password." }, { status: 400 });
    }
  } else {
    const updatedExtra = updateExtraPassword(email, parsed.data.newPassword);
    if (!updatedExtra) {
      setPasswordOverride(email, parsed.data.newPassword);
    }
    clearOtp(email);
  }

  await sendTransactionalEmail({
    to: email,
    subject: `Your ${getAppName()} password was updated`,
    html: passwordResetSuccessEmailHtml(),
  });

  return NextResponse.json({ success: true, message: "Password has been reset successfully." });
}
