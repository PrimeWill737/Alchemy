import { query } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  subscriptionAccessPurgeEmailHtml,
  subscriptionRenewalReminderEmailHtml,
  subscriptionWorkspaceClosedEmailHtml,
} from "@/lib/email/templates";
import { getAppName, getAppPublicUrl, getSubscriptionNotifyEmail } from "@/lib/email/env";

export type SubscriptionStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "renewal_submitted"
  | "active"
  | "expired"
  | "cancelled";

export type AdminSubscriptionRecord = {
  id: string;
  organizationId: string;
  billingContactUserId: string | null;
  signupPlanId: string | null;
  planNameSnapshot: string;
  amountNgn: number;
  isMonthly: boolean;
  status: SubscriptionStatus;
  transferReference: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  renewalReminderSentOn: string | null;
};

type Row = {
  id: string;
  organization_id: string;
  billing_contact_user_id: string | null;
  signup_plan_id: string | null;
  plan_name_snapshot: string;
  amount_ngn: string;
  is_monthly: boolean;
  status: string;
  transfer_reference: string | null;
  /** `pg` may return a JS Date for PostgreSQL `date` columns depending on config. */
  period_start: string | Date | null;
  period_end: string | Date | null;
  renewal_reminder_sent_on: string | Date | null;
};

function pgDateColumnToIsoDate(v: string | Date | null): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.length >= 10 ? v.slice(0, 10) : v;
  return String(v).slice(0, 10);
}

function rowToRecord(r: Row): AdminSubscriptionRecord {
  return {
    id: r.id,
    organizationId: r.organization_id,
    billingContactUserId: r.billing_contact_user_id,
    signupPlanId: r.signup_plan_id,
    planNameSnapshot: r.plan_name_snapshot,
    amountNgn: Number(r.amount_ngn),
    isMonthly: r.is_monthly,
    status: r.status as SubscriptionStatus,
    transferReference: r.transfer_reference,
    periodStart: pgDateColumnToIsoDate(r.period_start),
    periodEnd: pgDateColumnToIsoDate(r.period_end),
    renewalReminderSentOn: pgDateColumnToIsoDate(r.renewal_reminder_sent_on),
  };
}

const GRACE_DAYS_AFTER_PERIOD = 5;
const REMINDER_DAYS_BEFORE_END = 5;

export async function insertAdminSubscriptionForNewOrg(input: {
  organizationId: string;
  billingContactUserId: string;
  signupPlanId: string | null;
  planNameSnapshot: string;
  amountNgn: number;
  isMonthly: boolean;
}): Promise<AdminSubscriptionRecord> {
  const { rows } = await query<Row>(
    `INSERT INTO admin_subscriptions (
       organization_id, billing_contact_user_id, signup_plan_id,
       plan_name_snapshot, amount_ngn, is_monthly, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment')
     RETURNING id, organization_id, billing_contact_user_id, signup_plan_id, plan_name_snapshot,
               amount_ngn::text, is_monthly, status, transfer_reference,
               period_start, period_end, renewal_reminder_sent_on`,
    [
      input.organizationId,
      input.billingContactUserId,
      input.signupPlanId,
      input.planNameSnapshot,
      input.amountNgn,
      input.isMonthly,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create subscription");
  return rowToRecord(row);
}

export async function getSubscriptionByOrganizationId(
  organizationId: string,
): Promise<AdminSubscriptionRecord | null> {
  const { rows } = await query<Row>(
    `SELECT id, organization_id, billing_contact_user_id, signup_plan_id, plan_name_snapshot,
            amount_ngn::text, is_monthly, status, transfer_reference,
            period_start, period_end, renewal_reminder_sent_on
     FROM admin_subscriptions
     WHERE organization_id = $1
     LIMIT 1`,
    [organizationId],
  );
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export function subscriptionRecordGrantsAppAccess(sub: AdminSubscriptionRecord, today: string): boolean {
  if (
    sub.status === "cancelled" ||
    sub.status === "awaiting_payment" ||
    sub.status === "payment_submitted"
  ) {
    return false;
  }
  if (sub.status === "expired") return false;
  if (sub.status === "renewal_submitted") {
    if (!sub.isMonthly || !sub.periodEnd) return false;
    return today <= sub.periodEnd;
  }
  if (sub.status !== "active") return false;
  if (!sub.isMonthly) return true;
  if (!sub.periodEnd) return true;
  return today <= sub.periodEnd;
}

/** today as YYYY-MM-DD in UTC (matches PostgreSQL CURRENT_DATE on typical server TZ; good enough for billing windows). */
export function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function syncAllSubscriptionLifecycles(): Promise<void> {
  const { rows } = await query<{ organization_id: string }>(`SELECT organization_id FROM admin_subscriptions`);
  for (const row of rows) {
    await syncSubscriptionLifecycleForOrganization(row.organization_id);
  }
}

export async function syncSubscriptionLifecycleForOrganization(organizationId: string): Promise<void> {
  const { rows: todayRows } = await query<{ d: string }>(`SELECT CURRENT_DATE::text AS d`);
  const today = todayRows[0]?.d ?? utcDateString();

  const sub = await getSubscriptionByOrganizationId(organizationId);
  if (!sub) return;

  if (
    (sub.status === "active" || sub.status === "renewal_submitted") &&
    sub.isMonthly &&
    sub.periodEnd &&
    today > sub.periodEnd
  ) {
    await query(
      `UPDATE admin_subscriptions
       SET status = 'expired', updated_at = NOW()
       WHERE id = $1 AND status IN ('active', 'renewal_submitted')`,
      [sub.id],
    );
    sub.status = "expired";
  }

  const refreshed = (await getSubscriptionByOrganizationId(organizationId)) ?? sub;

  if (
    refreshed.status === "active" &&
    refreshed.isMonthly &&
    refreshed.periodEnd &&
    !refreshed.renewalReminderSentOn
  ) {
    const end = refreshed.periodEnd;
    const reminderStart = addDaysToIsoDate(end, -REMINDER_DAYS_BEFORE_END);
    if (today >= reminderStart && today <= end) {
      const contact = await getUserEmailName(refreshed.billingContactUserId);
      if (contact) {
        await sendTransactionalEmail({
          to: contact.email,
          subject: `${REMINDER_DAYS_BEFORE_END} days left on your ${getAppName()} plan`,
          html: subscriptionRenewalReminderEmailHtml({
            name: contact.name,
            planName: refreshed.planNameSnapshot,
            periodEnd: refreshed.periodEnd,
            billingUrl: `${getAppPublicUrl()}/settings/billing`,
          }),
        });
      }
      await query(
        `UPDATE admin_subscriptions SET renewal_reminder_sent_on = $2::date, updated_at = NOW() WHERE id = $1`,
        [refreshed.id, today],
      );
    }
  }

  const current = (await getSubscriptionByOrganizationId(organizationId)) ?? refreshed;

  if (current.status === "expired" && current.isMonthly && current.periodEnd) {
    const purgeAfter = addDaysToIsoDate(current.periodEnd, GRACE_DAYS_AFTER_PERIOD);
    if (today > purgeAfter) {
      await purgeOrganizationBillingAccess(current);
    }
  }
}

function addDaysToIsoDate(isoDate: string | Date, deltaDays: number): string {
  const ymd =
    typeof isoDate === "string"
      ? isoDate.slice(0, 10)
      : isoDate instanceof Date
        ? isoDate.toISOString().slice(0, 10)
        : String(isoDate).slice(0, 10);
  const [y, m, d] = ymd.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export type SubscriptionBillingUiFlags = {
  canSubmitNewOrLapsedPayment: boolean;
  canSubmitEarlyRenewal: boolean;
  awaitingApproval: boolean;
};

export function getSubscriptionBillingUiFlags(
  sub: AdminSubscriptionRecord,
  today: string,
): SubscriptionBillingUiFlags {
  const end = sub.periodEnd;
  const inEarlyWindow =
    Boolean(end) &&
    today >= addDaysToIsoDate(end!, -REMINDER_DAYS_BEFORE_END) &&
    today <= end!;
  return {
    canSubmitNewOrLapsedPayment: ["awaiting_payment", "expired", "cancelled"].includes(sub.status),
    canSubmitEarlyRenewal: sub.status === "active" && sub.isMonthly && inEarlyWindow,
    awaitingApproval: sub.status === "payment_submitted" || sub.status === "renewal_submitted",
  };
}

async function getUserEmailName(userId: string | null): Promise<{ email: string; name: string } | null> {
  if (!userId) return null;
  const { rows } = await query<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

async function purgeOrganizationBillingAccess(sub: AdminSubscriptionRecord): Promise<void> {
  const { rows: users } = await query<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE organization_id = $1 AND is_active = TRUE`,
    [sub.organizationId],
  );

  await query(
    `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE organization_id = $1`,
    [sub.organizationId],
  );
  await query(`DELETE FROM admin_subscriptions WHERE id = $1`, [sub.id]);

  const notify = getSubscriptionNotifyEmail();
  await sendTransactionalEmail({
    to: notify,
    subject: "Subscription grace ended — workspace deactivated",
    html: subscriptionAccessPurgeEmailHtml({
      organizationId: sub.organizationId,
      planName: sub.planNameSnapshot,
      memberEmails: users.map((u) => u.email),
    }),
  });

  for (const u of users) {
    await sendTransactionalEmail({
      to: u.email,
      subject: `Your ${getAppName()} workspace has been closed`,
      html: subscriptionWorkspaceClosedEmailHtml({
        name: u.name,
      }),
    });
  }
}

export type SubmitSubscriptionPaymentResult =
  | { success: true; notifyKind: "initial" | "resubscribe" | "early_renewal" }
  | { success: false };

/**
 * Bank transfer submitted:
 * - Active monthly in the last 5 days of the period → renewal_submitted (access continues until period end).
 * - Awaiting / expired / cancelled → payment_submitted (clears period when renewing from expired/cancelled).
 */
export async function submitSubscriptionPaymentRequest(input: {
  organizationId: string;
  transferReference: string;
}): Promise<SubmitSubscriptionPaymentResult> {
  const ref = input.transferReference.trim();
  if (!ref) return { success: false };

  const sub = await getSubscriptionByOrganizationId(input.organizationId);
  if (!sub) return { success: false };

  const { rows: todayRows } = await query<{ d: string }>(`SELECT CURRENT_DATE::text AS d`);
  const today = todayRows[0]?.d ?? utcDateString();

  if (sub.status === "active" && sub.isMonthly && sub.periodEnd) {
    const reminderStart = addDaysToIsoDate(sub.periodEnd, -REMINDER_DAYS_BEFORE_END);
    if (today >= reminderStart && today <= sub.periodEnd) {
      const early = await query(
        `UPDATE admin_subscriptions
         SET status = 'renewal_submitted',
             transfer_reference = $2,
             updated_at = NOW()
         WHERE organization_id = $1
           AND status = 'active'
           AND is_monthly = TRUE
           AND period_end IS NOT NULL`,
        [input.organizationId, ref],
      );
      if ((early.rowCount ?? 0) > 0) {
        return { success: true, notifyKind: "early_renewal" };
      }
    }
  }

  const notifyKind: "initial" | "resubscribe" =
    sub.status === "expired" || sub.status === "cancelled" ? "resubscribe" : "initial";

  const result = await query(
    `UPDATE admin_subscriptions
     SET status = 'payment_submitted',
         transfer_reference = $2,
         period_start = CASE
           WHEN status IN ('expired', 'cancelled') THEN NULL
           ELSE period_start
         END,
         period_end = CASE
           WHEN status IN ('expired', 'cancelled') THEN NULL
           ELSE period_end
         END,
         renewal_reminder_sent_on = CASE
           WHEN status IN ('expired', 'cancelled') THEN NULL
           ELSE renewal_reminder_sent_on
         END,
         updated_at = NOW()
     WHERE organization_id = $1
       AND status IN ('awaiting_payment', 'expired', 'cancelled')`,
    [input.organizationId, ref],
  );
  if ((result.rowCount ?? 0) === 0) return { success: false };
  return { success: true, notifyKind };
}

export async function cancelSubscriptionForOrganization(organizationId: string): Promise<boolean> {
  const result = await query(
    `UPDATE admin_subscriptions
     SET status = 'cancelled',
         period_start = NULL,
         period_end = NULL,
         updated_at = NOW()
     WHERE organization_id = $1
       AND status IN (
         'active',
         'payment_submitted',
         'renewal_submitted',
         'awaiting_payment',
         'expired'
       )`,
    [organizationId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function approveSubscriptionById(subscriptionId: string): Promise<AdminSubscriptionRecord | null> {
  const { rows: meta } = await query<{ is_monthly: boolean }>(
    `SELECT is_monthly FROM admin_subscriptions WHERE id = $1 LIMIT 1`,
    [subscriptionId],
  );
  const isMonthly = meta[0]?.is_monthly ?? false;

  const { rows } = await query<Row>(
    `UPDATE admin_subscriptions SET
       status = 'active',
       period_start = CURRENT_DATE,
       period_end = CASE
         WHEN $2::boolean THEN (CURRENT_DATE + INTERVAL '1 month')::date - INTERVAL '1 day'
         ELSE NULL
       END,
       renewal_reminder_sent_on = NULL,
       updated_at = NOW()
     WHERE id = $1 AND status IN ('payment_submitted', 'renewal_submitted')
     RETURNING id, organization_id, billing_contact_user_id, signup_plan_id, plan_name_snapshot,
               amount_ngn::text, is_monthly, status, transfer_reference,
               period_start, period_end, renewal_reminder_sent_on`,
    [subscriptionId, isMonthly],
  );
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export type SubscriptionAdminListRow = AdminSubscriptionRecord & {
  organizationName: string;
  billingContactEmail: string | null;
  billingContactName: string | null;
};

export async function listSubscriptionsForSuperAdmin(): Promise<SubscriptionAdminListRow[]> {
  const { rows } = await query<
    Row & { organization_name: string; billing_email: string | null; billing_name: string | null }
  >(
    `SELECT s.id, s.organization_id, s.billing_contact_user_id, s.signup_plan_id, s.plan_name_snapshot,
            s.amount_ngn::text, s.is_monthly, s.status, s.transfer_reference,
            s.period_start, s.period_end, s.renewal_reminder_sent_on,
            o.name AS organization_name,
            u.email AS billing_email,
            u.name AS billing_name
     FROM admin_subscriptions s
     JOIN organizations o ON o.id = s.organization_id
     LEFT JOIN users u ON u.id = s.billing_contact_user_id
     ORDER BY s.updated_at DESC`,
  );
  return rows.map((r) => {
    const base = rowToRecord({
      id: r.id,
      organization_id: r.organization_id,
      billing_contact_user_id: r.billing_contact_user_id,
      signup_plan_id: r.signup_plan_id,
      plan_name_snapshot: r.plan_name_snapshot,
      amount_ngn: r.amount_ngn,
      is_monthly: r.is_monthly,
      status: r.status,
      transfer_reference: r.transfer_reference,
      period_start: r.period_start,
      period_end: r.period_end,
      renewal_reminder_sent_on: r.renewal_reminder_sent_on,
    });
    return {
      ...base,
      organizationName: r.organization_name,
      billingContactEmail: r.billing_email,
      billingContactName: r.billing_name,
    };
  });
}

export async function getSubscriptionById(id: string): Promise<AdminSubscriptionRecord | null> {
  const { rows } = await query<Row>(
    `SELECT id, organization_id, billing_contact_user_id, signup_plan_id, plan_name_snapshot,
            amount_ngn::text, is_monthly, status, transfer_reference,
            period_start, period_end, renewal_reminder_sent_on
     FROM admin_subscriptions
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] ? rowToRecord(rows[0]) : null;
}

export type SubscriptionNotifyContext = {
  organizationName: string;
  billingContactName: string;
  billingContactEmail: string;
  planName: string;
  amountNgn: number;
};

export async function getSubscriptionNotifyContext(
  organizationId: string,
): Promise<SubscriptionNotifyContext | null> {
  const { rows } = await query<{
    organization_name: string;
    billing_name: string | null;
    billing_email: string | null;
    plan_name_snapshot: string;
    amount_ngn: string;
  }>(
    `SELECT o.name AS organization_name, u.name AS billing_name, u.email AS billing_email,
            s.plan_name_snapshot, s.amount_ngn::text
     FROM admin_subscriptions s
     JOIN organizations o ON o.id = s.organization_id
     LEFT JOIN users u ON u.id = s.billing_contact_user_id
     WHERE s.organization_id = $1
     LIMIT 1`,
    [organizationId],
  );
  const r = rows[0];
  if (!r?.billing_email?.trim() || !r.billing_name?.trim()) return null;
  return {
    organizationName: r.organization_name,
    billingContactName: r.billing_name,
    billingContactEmail: r.billing_email,
    planName: r.plan_name_snapshot,
    amountNgn: Number(r.amount_ngn),
  };
}
