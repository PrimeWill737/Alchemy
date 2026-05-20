import type { UserRole } from "@/types/crm";
import { getExtraByEmail, hasExtraEmail } from "@/lib/extra-accounts";
import { getPasswordOverride } from "@/lib/password-overrides";

export type ResolvedAccount = {
  email: string;
  displayName: string;
  userId: string;
  role: UserRole;
};

/** Built-in demo accounts (password may be overridden in memory after OTP reset). */
export const DEMO_ACCOUNTS = {
  superAdmin: {
    email: "williambosworth420@gmail.com",
    password: "Willy0@gmail.com",
    displayName: "William Bosworth",
    userId: "u1",
    role: "super_admin" as const,
  },
  admin: {
    email: "hr.admin@crmsuite.com",
    password: "HRAdmin@12345",
    displayName: "Leo Hayes",
    userId: "u2",
    role: "admin" as const,
  },
  marketer: {
    email: "marketing@crmsuite.com",
    password: "Marketing@12345",
    displayName: "Maya Chen",
    userId: "u4",
    role: "marketer" as const,
  },
} as const;

export const DUMMY_AUTH = DEMO_ACCOUNTS.superAdmin;

export const AUTH_COOKIE_NAME = "crm_session";
export const AUTH_COOKIE_VALUE = "demo-authenticated";
export const AUTH_ROLE_COOKIE_NAME = "crm_role";
export const AUTH_USER_COOKIE_NAME = "crm_user";
export const AUTH_USER_ID_COOKIE_NAME = "crm_user_id";
export const AUTH_MUST_RESET_COOKIE_NAME = "crm_must_reset";

export function listStaticAccounts() {
  return Object.values(DEMO_ACCOUNTS);
}

export function canRequestPasswordReset(email: string): boolean {
  const n = email.trim().toLowerCase();
  if (listStaticAccounts().some((a) => a.email.toLowerCase() === n)) return true;
  return hasExtraEmail(n);
}

export function findAccountProfileByEmail(email: string): ResolvedAccount | null {
  const n = email.trim().toLowerCase();
  const stat = listStaticAccounts().find((a) => a.email.toLowerCase() === n);
  if (stat) {
    return {
      email: stat.email,
      displayName: stat.displayName,
      userId: stat.userId,
      role: stat.role,
    };
  }
  const ex = getExtraByEmail(n);
  if (ex) {
    return {
      email: ex.email,
      displayName: ex.displayName,
      userId: ex.userId,
      role: ex.role,
    };
  }
  return null;
}

export function resolveLogin(email: string, password: string): ResolvedAccount | null {
  const n = email.trim().toLowerCase();
  const stat = listStaticAccounts().find((a) => a.email.toLowerCase() === n);
  if (stat) {
    const override = getPasswordOverride(n);
    const effectivePassword = override ?? stat.password;
    if (effectivePassword !== password) return null;
    return {
      email: stat.email,
      displayName: stat.displayName,
      userId: stat.userId,
      role: stat.role,
    };
  }
  const ex = getExtraByEmail(n);
  if (!ex || ex.password !== password) return null;
  return {
    email: ex.email,
    displayName: ex.displayName,
    userId: ex.userId,
    role: ex.role,
  };
}

export function isValidDemoAccount(email?: string, password?: string) {
  if (!email || !password) return false;
  return resolveLogin(email, password) !== null;
}

export function getDemoAccount(email?: string, password?: string) {
  if (!email || !password) return undefined;
  const acc = resolveLogin(email, password);
  if (!acc) return undefined;
  return {
    ...acc,
    password,
  };
}
