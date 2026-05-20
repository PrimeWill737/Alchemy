import { NextRequest, NextResponse } from "next/server";
import { getAppName } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { getSessionFromRequest } from "@/lib/request-session";

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    toEmail?: string;
    fromName?: string;
    fromEmail?: string;
    requestId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim() : "";
  const fromName = typeof body.fromName === "string" ? body.fromName.trim() : "";
  const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim() : "";
  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";

  if (!toEmail || !fromName || !fromEmail) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const app = getAppName();
  const html = `
    <p><strong>${fromName}</strong> (${fromEmail}) wants to start a direct message thread with you on ${app}.</p>
    <p>Sign in to your dashboard → <strong>Notifications</strong> or <strong>Messaging</strong> to <strong>Accept</strong> or <strong>Reject</strong> this request.</p>
    ${requestId ? `<p style="color:#666;font-size:12px">Reference: ${requestId}</p>` : ""}
  `;

  const result = await sendTransactionalEmail({
    to: toEmail,
    subject: `${fromName} invited you to chat on ${app}`,
    html,
  });

  return NextResponse.json({
    ok: true,
    emailSent: result.ok,
    emailError: result.error,
  });
}
