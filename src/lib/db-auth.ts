import { getDb, query } from "@/lib/db";
import type { UserRole } from "@/types/crm";
import { createSignupOrganization } from "@/lib/db-organizations";
import { insertAdminSubscriptionForNewOrg } from "@/lib/db-subscriptions";

type AuthUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

function rowToAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
  };
}

export type AuthenticateResult = {
  user: AuthUser;
  mustChangePassword: boolean;
  usedInviteOtp: boolean;
};

export function generateLoginOtpCode(): string {
  const n = Math.floor(10000000 + Math.random() * 90000000);
  return String(n);
}

export async function authenticateDbUser(email: string, password: string): Promise<AuthenticateResult | null> {
  const { rows } = await query<AuthUserRow & { must_change_password: boolean }>(
    `SELECT id, name, email, role::text, must_change_password
     FROM users
     WHERE lower(email) = lower($1)
       AND is_active = TRUE
       AND password_hash = crypt($2, password_hash)
     LIMIT 1`,
    [email, password],
  );
  if (rows[0]) {
    return {
      user: rowToAuthUser(rows[0]),
      mustChangePassword: Boolean(rows[0].must_change_password),
      usedInviteOtp: false,
    };
  }

  const otpUser = await authenticateDbUserWithInviteOtp(email, password);
  return otpUser;
}

export async function authenticateDbUserWithInviteOtp(
  email: string,
  otpCode: string,
): Promise<AuthenticateResult | null> {
  const db = getDb();
  if (!db) return null;
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<AuthUserRow & { must_change_password: boolean }>(
      `SELECT u.id, u.name, u.email, u.role::text, u.must_change_password
       FROM users u
       INNER JOIN user_login_otps o ON o.user_id = u.id
       WHERE lower(u.email) = lower($1)
         AND u.is_active = TRUE
         AND o.consumed_at IS NULL
         AND o.expires_at > NOW()
         AND o.otp_hash = ${otpHashSql()}
       LIMIT 1`,
      [email, otpCode],
    );
    const row = rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE user_login_otps
       SET consumed_at = NOW(), updated_at = NOW()
       WHERE user_id = $1`,
      [row.id],
    );
    await client.query("COMMIT");
    return {
      user: rowToAuthUser(row),
      mustChangePassword: true,
      usedInviteOtp: true,
    };
  } catch {
    await client.query("ROLLBACK");
    return null;
  } finally {
    client.release();
  }
}

export async function issueUserLoginOtp(userId: string, email: string, otpCode: string): Promise<void> {
  await query(
    `INSERT INTO user_login_otps (user_id, email, otp_hash, expires_at, consumed_at)
     VALUES ($1, lower($2), encode(digest($3, 'sha256'), 'hex'), NOW() + INTERVAL '7 days', NULL)
     ON CONFLICT (user_id)
     DO UPDATE SET
       email = EXCLUDED.email,
       otp_hash = EXCLUDED.otp_hash,
       expires_at = EXCLUDED.expires_at,
       consumed_at = NULL,
       updated_at = NOW()`,
    [userId, email, otpCode],
  );
  await query(
    `UPDATE users SET must_change_password = TRUE, updated_at = NOW() WHERE id = $1`,
    [userId],
  );
}

export async function clearMustChangePassword(userId: string): Promise<void> {
  await query(
    `UPDATE users SET must_change_password = FALSE, updated_at = NOW() WHERE id = $1`,
    [userId],
  );
}

export async function getDbUserMustChangePassword(userId: string): Promise<boolean> {
  const { rows } = await query<{ must_change_password: boolean }>(
    `SELECT must_change_password FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [userId],
  );
  return Boolean(rows[0]?.must_change_password);
}

export async function verifyDbUserPassword(userId: string, password: string): Promise<boolean> {
  const { rows } = await query<{ ok: boolean }>(
    `SELECT (password_hash = crypt($2, password_hash)) AS ok
     FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [userId, password],
  );
  return Boolean(rows[0]?.ok);
}

export async function hasDbAccount(email: string): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM users WHERE lower(email) = lower($1) AND is_active = TRUE
     )`,
    [email],
  );
  return Boolean(rows[0]?.exists);
}

export type CreateSignupInput = {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
  roleTitle: string;
  packageTier: string;
  packageCurrency: "NGN" | "USD";
  packageAmount: number;
  phone?: string;
  signupPlanId: string;
  isMonthlyPlan: boolean;
};

export async function createDbSignupUser(input: CreateSignupInput): Promise<AuthUser> {
  const organizationId = await createSignupOrganization(input.companyName);

  const { rows } = await query<AuthUserRow>(
    `INSERT INTO users (
      organization_id, name, email, password_hash, role, company_role_preset,
      company_name, role_title, package_tier, package_currency, package_amount, phone
    )
    VALUES (
      $1, $2, $3, crypt($4, gen_salt('bf')), 'admin'::user_role, 'admin',
      $5, $6, $7, $8, $9, $10
    )
    RETURNING id, name, email, role::text`,
    [
      organizationId,
      input.fullName,
      input.email,
      input.password,
      input.companyName,
      input.roleTitle,
      input.packageTier,
      input.packageCurrency,
      input.packageAmount,
      input.phone ?? null,
    ],
  );

  const row = rows[0];
  if (!row) throw new Error("Failed to create user");

  await insertAdminSubscriptionForNewOrg({
    organizationId,
    billingContactUserId: row.id,
    signupPlanId: input.signupPlanId,
    planNameSnapshot: input.packageTier,
    amountNgn: input.packageAmount,
    isMonthly: input.isMonthlyPlan,
  });

  return rowToAuthUser(row);
}

function otpHashSql() {
  return "encode(digest($2, 'sha256'), 'hex')";
}

export async function issueDbPasswordResetOtp(email: string, otpCode: string): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) AND is_active = TRUE LIMIT 1`,
    [email],
  );
  const user = rows[0];
  if (!user) return false;

  await query(
    `INSERT INTO password_reset_otps (email, user_id, otp_hash, expires_at, attempt_count, consumed_at)
     VALUES (lower($1), $3, ${otpHashSql()}, NOW() + INTERVAL '10 minutes', 0, NULL)
     ON CONFLICT (email)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       otp_hash = EXCLUDED.otp_hash,
       expires_at = EXCLUDED.expires_at,
       attempt_count = 0,
       consumed_at = NULL,
       updated_at = NOW()`,
    [email, otpCode, user.id],
  );

  return true;
}

export async function verifyAndConsumeDbOtp(email: string, otpCode: string): Promise<boolean> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const success = await client.query(
      `UPDATE password_reset_otps
       SET consumed_at = NOW(), updated_at = NOW()
       WHERE email = lower($1)
         AND consumed_at IS NULL
         AND expires_at > NOW()
         AND attempt_count < 10
         AND otp_hash = ${otpHashSql()}
       RETURNING email`,
      [email, otpCode],
    );

    if (success.rowCount && success.rowCount > 0) {
      await client.query("COMMIT");
      return true;
    }

    await client.query(
      `UPDATE password_reset_otps
       SET attempt_count = attempt_count + 1, updated_at = NOW()
       WHERE email = lower($1)
         AND consumed_at IS NULL
         AND expires_at > NOW()`,
      [email],
    );
    await client.query("COMMIT");
    return false;
  } catch {
    await client.query("ROLLBACK");
    return false;
  } finally {
    client.release();
  }
}

export async function updateDbPassword(email: string, newPassword: string): Promise<boolean> {
  const result = await query(
    `UPDATE users
     SET password_hash = crypt($2, gen_salt('bf')),
         must_change_password = FALSE,
         updated_at = NOW()
     WHERE lower(email) = lower($1) AND is_active = TRUE`,
    [email, newPassword],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateDbPasswordByUserId(userId: string, newPassword: string): Promise<boolean> {
  const result = await query(
    `UPDATE users
     SET password_hash = crypt($2, gen_salt('bf')),
         must_change_password = FALSE,
         updated_at = NOW()
     WHERE id = $1 AND is_active = TRUE`,
    [userId, newPassword],
  );
  return (result.rowCount ?? 0) > 0;
}
