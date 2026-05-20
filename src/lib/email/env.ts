import { APP_BRAND_NAME } from "@/lib/brand";

export function getAppPublicUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? "";
}

/** Always sends as Alchemy; address comes from RESEND_FROM_EMAIL. */
export function getEmailFrom() {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  const address =
    configured?.match(/<([^>]+)>/)?.[1] ??
    (configured && /^[^\s<]+@[^\s>]+$/.test(configured) ? configured : null) ??
    "onboarding@resend.dev";
  return `${APP_BRAND_NAME} <${address}>`;
}

export function getBrandLogoUrl() {
  return (
    process.env.EMAIL_BRAND_LOGO_URL ??
    `${getAppPublicUrl()}/landing-hero-visual.svg`
  );
}

export function getAppName() {
  return APP_BRAND_NAME;
}

/** Super-admin inbox for bank-transfer subscription confirmations (default matches product owner). */
export function getSubscriptionNotifyEmail() {
  return (
    process.env.SUBSCRIPTION_NOTIFY_EMAIL?.trim() || "williambosworth777@icloud.com"
  );
}
