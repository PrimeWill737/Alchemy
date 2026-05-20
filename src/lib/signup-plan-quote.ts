import type { PublicSignupPlan } from "@/lib/db-signup-plans";

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatSignupPlanForDisplay(plan: PublicSignupPlan): string {
  if (plan.isCustomQuote) return "Custom";
  return `${naira.format(plan.amountNgn ?? 0)}${plan.priceSuffix}`;
}

export function formatSignupPlanQuotedForEmail(plan: PublicSignupPlan): string {
  if (plan.isCustomQuote) return "Custom pricing";
  return `${naira.format(plan.amountNgn ?? 0)}${plan.priceSuffix}`;
}
