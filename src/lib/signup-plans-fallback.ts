import type { PublicSignupPlan } from "@/lib/db-signup-plans";

/** Used when DATABASE_URL is unset so local demo and marketing still work. Not editable via Control Center. */
export const SIGNUP_PLANS_FALLBACK: PublicSignupPlan[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Starter",
    slug: "starter",
    amountNgn: 25_000,
    priceSuffix: "/user",
    features: ["Leads & customers", "Core reports"],
    isCustomQuote: false,
    sortOrder: 0,
    isActive: true,
    billingInterval: "one_time",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Growth",
    slug: "growth",
    amountNgn: 59_000,
    priceSuffix: "/user",
    features: ["Everything in Starter", "Automation & messaging"],
    isCustomQuote: false,
    sortOrder: 1,
    isActive: true,
    billingInterval: "monthly",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Enterprise",
    slug: "enterprise",
    amountNgn: null,
    priceSuffix: "",
    features: ["Integrations & SSO", "Dedicated support"],
    isCustomQuote: true,
    sortOrder: 2,
    isActive: true,
    billingInterval: "one_time",
  },
];

export function listFallbackSignupPlansActive(): PublicSignupPlan[] {
  return SIGNUP_PLANS_FALLBACK;
}

export function getFallbackSignupPlanById(id: string): PublicSignupPlan | undefined {
  return SIGNUP_PLANS_FALLBACK.find((p) => p.id === id);
}
