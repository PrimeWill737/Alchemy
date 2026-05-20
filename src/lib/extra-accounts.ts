import type { UserRole } from "@/types/crm";

export type ExtraAccountRecord = {
  email: string;
  password: string;
  displayName: string;
  userId: string;
  role: UserRole;
  companyName: string;
  roleTitle?: string;
  packageTier?: string;
  packageCurrency?: "NGN" | "USD";
  packageAmount?: number;
  phone?: string;
};

const byEmail = new Map<string, ExtraAccountRecord>();

export function registerExtraAccount(record: ExtraAccountRecord) {
  byEmail.set(record.email.trim().toLowerCase(), record);
}

export function getExtraByEmail(email: string): ExtraAccountRecord | undefined {
  return byEmail.get(email.trim().toLowerCase());
}

export function updateExtraPassword(email: string, newPassword: string) {
  const key = email.trim().toLowerCase();
  const cur = byEmail.get(key);
  if (!cur) return false;
  byEmail.set(key, { ...cur, password: newPassword });
  return true;
}

export function hasExtraEmail(email: string): boolean {
  return byEmail.has(email.trim().toLowerCase());
}
