import { Resend } from "resend";
import { applyBrandName } from "@/lib/brand";
import { getEmailFrom, getResendApiKey } from "@/lib/email/env";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendTransactionalEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — skipping send to", params.to);
    return { ok: false, error: "Email not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: params.to,
      subject: applyBrandName(params.subject),
      html: applyBrandName(params.html),
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    console.error("[email]", message);
    return { ok: false, error: message };
  }
}
