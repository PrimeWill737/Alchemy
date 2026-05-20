import { query } from "@/lib/db";

export type SignupPlanRow = {
  id: string;
  name: string;
  slug: string;
  amount_ngn: string | null;
  price_suffix: string;
  feature_lines: string[];
  sort_order: number;
  is_active: boolean;
  is_custom_quote: boolean;
  billing_interval?: string | null;
};

export type PublicSignupPlan = {
  id: string;
  name: string;
  slug: string;
  amountNgn: number | null;
  priceSuffix: string;
  features: string[];
  isCustomQuote: boolean;
  sortOrder: number;
  isActive: boolean;
  billingInterval: "one_time" | "monthly";
};

function rowToPublic(row: SignupPlanRow): PublicSignupPlan {
  const bi = row.billing_interval === "monthly" ? "monthly" : "one_time";
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    amountNgn: row.amount_ngn === null || row.amount_ngn === undefined ? null : Number(row.amount_ngn),
    priceSuffix: row.price_suffix,
    features: row.feature_lines ?? [],
    isCustomQuote: row.is_custom_quote,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    billingInterval: bi,
  };
}

export async function listActiveSignupPlansForPublic(): Promise<PublicSignupPlan[]> {
  const { rows } = await query<SignupPlanRow>(
    `SELECT id, name, slug, amount_ngn::text, price_suffix, feature_lines, sort_order, is_active, is_custom_quote,
            billing_interval
     FROM signup_plans
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows.map(rowToPublic);
}

export async function listAllSignupPlansForAdmin(): Promise<PublicSignupPlan[]> {
  const { rows } = await query<SignupPlanRow>(
    `SELECT id, name, slug, amount_ngn::text, price_suffix, feature_lines, sort_order, is_active, is_custom_quote,
            billing_interval
     FROM signup_plans
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows.map(rowToPublic);
}

/** Feature bullets for billing UI (includes inactive plans linked from old subscriptions). */
export async function getSignupPlanFeatureLinesById(planId: string | null): Promise<string[]> {
  if (!planId) return [];
  const { rows } = await query<{ feature_lines: string[] }>(
    `SELECT feature_lines FROM signup_plans WHERE id = $1 LIMIT 1`,
    [planId],
  );
  return (rows[0]?.feature_lines ?? []).map((s) => String(s).trim()).filter(Boolean);
}

export async function getActiveSignupPlanById(id: string): Promise<PublicSignupPlan | null> {
  const { rows } = await query<SignupPlanRow>(
    `SELECT id, name, slug, amount_ngn::text, price_suffix, feature_lines, sort_order, is_active, is_custom_quote,
            billing_interval
     FROM signup_plans
     WHERE id = $1 AND is_active = TRUE
     LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToPublic(rows[0]) : null;
}

export type UpsertSignupPlanInput = {
  name: string;
  slug: string;
  amountNgn: number | null;
  priceSuffix: string;
  featureLines: string[];
  sortOrder: number;
  isActive: boolean;
  isCustomQuote: boolean;
  billingInterval: "one_time" | "monthly";
};

export async function insertSignupPlan(input: UpsertSignupPlanInput): Promise<PublicSignupPlan> {
  const { rows } = await query<SignupPlanRow>(
    `INSERT INTO signup_plans (
       name, slug, amount_ngn, price_suffix, feature_lines, sort_order, is_active, is_custom_quote, billing_interval
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, slug, amount_ngn::text, price_suffix, feature_lines, sort_order, is_active, is_custom_quote,
               billing_interval`,
    [
      input.name.trim(),
      input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      input.isCustomQuote ? null : input.amountNgn,
      input.priceSuffix.trim() || "/user",
      input.featureLines.map((l) => l.trim()).filter(Boolean),
      input.sortOrder,
      input.isActive,
      input.isCustomQuote,
      input.billingInterval,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Insert failed");
  return rowToPublic(row);
}

export async function updateSignupPlan(
  id: string,
  input: UpsertSignupPlanInput,
): Promise<PublicSignupPlan | null> {
  const { rows } = await query<SignupPlanRow>(
    `UPDATE signup_plans SET
       name = $2,
       slug = $3,
       amount_ngn = $4,
       price_suffix = $5,
       feature_lines = $6,
       sort_order = $7,
       is_active = $8,
       is_custom_quote = $9,
       billing_interval = $10,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, slug, amount_ngn::text, price_suffix, feature_lines, sort_order, is_active, is_custom_quote,
               billing_interval`,
    [
      id,
      input.name.trim(),
      input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      input.isCustomQuote ? null : input.amountNgn,
      input.priceSuffix.trim() || "/user",
      input.featureLines.map((l) => l.trim()).filter(Boolean),
      input.sortOrder,
      input.isActive,
      input.isCustomQuote,
      input.billingInterval,
    ],
  );
  return rows[0] ? rowToPublic(rows[0]) : null;
}

export async function deleteSignupPlan(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM signup_plans WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
