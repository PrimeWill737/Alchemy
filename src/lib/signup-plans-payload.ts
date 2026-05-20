import { z } from "zod";

/** Align with client `toSlug`: safe for URLs and DB unique constraint. */
export function normalizePlanSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const signupPlanUpsertSchema = z
  .object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(1, "Slug or plan name is required")
      .transform((s) => normalizePlanSlug(s))
      .pipe(
        z
          .string()
          .min(1, "Slug must contain letters or numbers")
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
      ),
    // null must be accepted before any numeric coercion — z.coerce.number() turns null into 0.
    amountNgn: z.preprocess((v) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") {
        return Number.isNaN(v) ? null : v;
      }
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    }, z.union([z.null(), z.number().nonnegative()])),
    priceSuffix: z
      .string()
      .optional()
      .transform((s) => (s && s.trim()) || "/user"),
    featureLines: z.array(z.string()).optional().default([]),
    sortOrder: z.coerce.number().int().optional().default(0),
    isActive: z.boolean().optional().default(true),
    isCustomQuote: z.boolean().optional().default(false),
    billingInterval: z.enum(["one_time", "monthly"]).optional().default("one_time"),
  })
  .superRefine((data, ctx) => {
    if (!data.isCustomQuote && data.amountNgn === null) {
      ctx.addIssue({
        code: "custom",
        message: "Amount is required unless this is a custom-quote plan",
        path: ["amountNgn"],
      });
    }
    if (data.isCustomQuote && data.amountNgn !== null) {
      ctx.addIssue({
        code: "custom",
        message: "Custom-quote plans must not include a fixed amount",
        path: ["amountNgn"],
      });
    }
  });

export type SignupPlanUpsertInput = z.infer<typeof signupPlanUpsertSchema>;
