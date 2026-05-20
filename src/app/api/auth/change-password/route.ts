import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_MUST_RESET_COOKIE_NAME, listStaticAccounts, resolveLogin } from "@/lib/auth";
import { getDb, query } from "@/lib/db";
import {
  clearMustChangePassword,
  getDbUserMustChangePassword,
  updateDbPasswordByUserId,
  verifyDbUserPassword,
} from "@/lib/db-auth";
import { getSessionFromRequest } from "@/lib/request-session";
import { sendTransactionalEmail } from "@/lib/email/send";
import { passwordResetSuccessEmailHtml } from "@/lib/email/templates";
import { getAppName } from "@/lib/email/env";
import { setPasswordOverride } from "@/lib/password-overrides";
import { mockUsers } from "@/lib/mock-db";

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

function resolveDemoEmail(userId: string): string | null {
  return (
    mockUsers.find((u) => u.id === userId)?.email ??
    listStaticAccounts().find((a) => a.userId === userId)?.email ??
    null
  );
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid password payload." }, { status: 400 });
  }

  const mustResetCookie = request.cookies.get(AUTH_MUST_RESET_COOKIE_NAME)?.value === "1";
  const db = getDb();

  if (db) {
    const mustChange = mustResetCookie || (await getDbUserMustChangePassword(session.userId));
    if (!mustChange) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { success: false, message: "Current password is required." },
          { status: 400 },
        );
      }
      const ok = await verifyDbUserPassword(session.userId, parsed.data.currentPassword);
      if (!ok) {
        return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 400 });
      }
    }

    const updated = await updateDbPasswordByUserId(session.userId, parsed.data.newPassword);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Unable to update password." }, { status: 400 });
    }
    await clearMustChangePassword(session.userId);

    const { rows } = await query<{ email: string }>(
      `SELECT email FROM users WHERE id = $1 LIMIT 1`,
      [session.userId],
    );
    const email = rows[0]?.email;
    if (email) {
      await sendTransactionalEmail({
        to: email,
        subject: `Your ${getAppName()} password was updated`,
        html: passwordResetSuccessEmailHtml(),
      });
    }
  } else {
    const email = resolveDemoEmail(session.userId);
    if (!email) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 400 });
    }
    if (!mustResetCookie) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { success: false, message: "Current password is required." },
          { status: 400 },
        );
      }
      if (!resolveLogin(email, parsed.data.currentPassword)) {
        return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 400 });
      }
    }
    setPasswordOverride(email, parsed.data.newPassword);
  }

  const response = NextResponse.json({ success: true, message: "Password updated successfully." });
  response.cookies.set(AUTH_MUST_RESET_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
