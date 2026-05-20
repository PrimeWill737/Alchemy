import type { PermissionLevel, User, UserRole } from "@/types/crm";
import { getDb, query } from "@/lib/db";
import { DEFAULT_DISPLAY_CURRENCY } from "@/lib/display-currencies";

export type DbUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  company_role_preset: string | null;
  custom_company_role: string | null;
  permission_level: string | null;
  supervising_admin_id: string | null;
  display_currency: string | null;
  created_at: Date | string;
};

function rowToUser(row: DbUserRow): User {
  const created =
    row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    createdAt: created,
    companyRolePreset: row.company_role_preset ?? undefined,
    customCompanyRole: row.custom_company_role ?? undefined,
    permissionLevel: (row.permission_level as PermissionLevel) ?? "standard",
    supervisingAdminId: row.supervising_admin_id ?? undefined,
    displayCurrency: row.display_currency ?? DEFAULT_DISPLAY_CURRENCY,
  };
}

export async function listUsersByOrganization(organizationId: string): Promise<User[]> {
  const { rows } = await query<DbUserRow>(
    `SELECT id, name, email, role::text, company_role_preset, custom_company_role, permission_level,
            supervising_admin_id, display_currency, created_at
     FROM users
     WHERE organization_id = $1 AND is_active = TRUE
     ORDER BY created_at ASC`,
    [organizationId],
  );
  return rows.map(rowToUser);
}

export type CreateUserInput = {
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  companyRolePreset: string;
  customCompanyRole?: string;
  permissionLevel: PermissionLevel;
  supervisingAdminId?: string;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  const { rows } = await query<DbUserRow>(
    `INSERT INTO users (
       organization_id, name, email, password_hash, role,
       company_role_preset, custom_company_role, permission_level, supervising_admin_id,
       must_change_password
     )
     VALUES ($1, $2, $3, encode(gen_random_bytes(32), 'hex'), $4::user_role, $5, $6, $7, $8, TRUE)
     RETURNING id, name, email, role::text, company_role_preset, custom_company_role, permission_level,
               supervising_admin_id, display_currency, created_at`,
    [
      input.organizationId,
      input.name,
      input.email,
      input.role,
      input.companyRolePreset,
      input.customCompanyRole ?? null,
      input.permissionLevel,
      input.supervisingAdminId ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Insert failed");
  return rowToUser(row);
}

export type UserOrgAccess = {
  organizationId: string;
  role: UserRole;
  permissionLevel: PermissionLevel;
};

export async function getUserOrgAccess(userId: string): Promise<UserOrgAccess | null> {
  if (!getDb()) return null;
  const { rows } = await query<{
    organization_id: string;
    role: string;
    permission_level: string | null;
  }>(
    `SELECT organization_id, role::text, permission_level
     FROM users
     WHERE id = $1 AND is_active = TRUE
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    organizationId: row.organization_id,
    role: row.role as UserRole,
    permissionLevel: (row.permission_level as PermissionLevel) ?? "standard",
  };
}

export async function getDefaultOrganizationId(): Promise<string | null> {
  const envId = process.env.CRM_DEFAULT_ORGANIZATION_ID;
  if (envId) return envId;
  const { rows } = await query<{ id: string }>(`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`);
  return rows[0]?.id ?? null;
}

export type UserDeactivationTarget = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  supervisingAdminId: string | null;
};

export async function getUserDeactivationTarget(
  organizationId: string,
  userId: string,
): Promise<UserDeactivationTarget | null> {
  const { rows } = await query<{
    id: string;
    email: string;
    name: string;
    role: string;
    supervising_admin_id: string | null;
  }>(
    `SELECT id, email, name, role::text, supervising_admin_id
     FROM users
     WHERE organization_id = $1 AND id = $2 AND is_active = TRUE
     LIMIT 1`,
    [organizationId, userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    supervisingAdminId: row.supervising_admin_id,
  };
}

export async function deactivateUserInOrganization(organizationId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE users
     SET is_active = FALSE, updated_at = NOW()
     WHERE organization_id = $1 AND id = $2 AND is_active = TRUE`,
    [organizationId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export type UserContact = {
  id: string;
  name: string;
  email: string;
};

export async function getUserContact(
  organizationId: string,
  userId: string,
): Promise<UserContact | null> {
  const { rows } = await query<{ id: string; name: string; email: string }>(
    `SELECT id, name, email
     FROM users
     WHERE organization_id = $1 AND id = $2 AND is_active = TRUE
     LIMIT 1`,
    [organizationId, userId],
  );
  const row = rows[0];
  return row ? { id: row.id, name: row.name, email: row.email } : null;
}

export async function updateUserDisplayCurrency(
  organizationId: string,
  userId: string,
  currency: string,
): Promise<User | null> {
  const { rows } = await query<DbUserRow>(
    `UPDATE users
     SET display_currency = $3, updated_at = NOW()
     WHERE organization_id = $1 AND id = $2 AND is_active = TRUE
     RETURNING id, name, email, role::text, company_role_preset, custom_company_role, permission_level,
               supervising_admin_id, display_currency, created_at`,
    [organizationId, userId, currency],
  );
  const row = rows[0];
  return row ? rowToUser(row) : null;
}
