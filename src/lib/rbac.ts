import type { PermissionLevel, UserRole } from "@/types/crm";

export type Permission =
  | "manage:users"
  | "manage:leads"
  | "view:customers"
  | "manage:deals"
  | "manage:tasks"
  | "view:reports"
  | "manage:settings";

/** Permission tiers that may remove customer records (admin / marketer only, plus role check). */
const CUSTOMER_DELETE_LEVELS: PermissionLevel[] = ["standard", "elevated", "full"];

/** Tiers that may edit the org-wide lead source list (super admin always may). */
const LEAD_SOURCE_CONFIG_LEVELS: PermissionLevel[] = ["standard", "elevated", "full"];

/** Tiers that may change lead pipeline status (sales roles with manage:leads). */
const LEAD_STATUS_UPDATE_LEVELS: PermissionLevel[] = ["limited", "standard", "elevated", "full"];

const rolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    "manage:users",
    "manage:leads",
    "view:customers",
    "manage:deals",
    "manage:tasks",
    "view:reports",
    "manage:settings",
  ],
  admin: [
    "manage:users",
    "manage:leads",
    "view:customers",
    "manage:deals",
    "manage:tasks",
    "view:reports",
  ],
  marketer: ["manage:leads", "view:customers"],
  sales_manager: ["manage:leads", "view:customers", "manage:deals", "manage:tasks", "view:reports"],
  sales_representative: ["manage:leads", "view:customers", "manage:deals", "manage:tasks"],
  support_agent: ["view:customers", "manage:tasks"],
  viewer: ["view:reports"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

/** Anyone who can open the customer module may add customers. */
export function canAddCustomer(role: UserRole) {
  return hasPermission(role, "view:customers");
}

/**
 * Only Super Admin, Admin, and Marketer may delete customers.
 * Admin-assigned permission level must be standard or higher (not read-only / limited).
 */
export function canDeleteCustomer(role: UserRole, permissionLevel?: PermissionLevel) {
  if (role === "super_admin") return true;
  if (role !== "admin" && role !== "marketer") return false;
  const level = permissionLevel ?? "read_only";
  return CUSTOMER_DELETE_LEVELS.includes(level);
}

/**
 * Super Admin always; others need `manage:leads` and an admin-assigned permission tier of standard or higher.
 */
export function canManageLeadSources(role: UserRole, permissionLevel?: PermissionLevel) {
  if (role === "super_admin") return true;
  if (!hasPermission(role, "manage:leads")) return false;
  const level = permissionLevel ?? "read_only";
  return LEAD_SOURCE_CONFIG_LEVELS.includes(level);
}

/** Change lead status in the pipeline table (not read-only / limited-only viewers). */
export function canUpdateLeadStatus(role: UserRole, permissionLevel?: PermissionLevel) {
  if (role === "super_admin") return true;
  if (!hasPermission(role, "manage:leads")) return false;
  const level = permissionLevel ?? "read_only";
  return LEAD_STATUS_UPDATE_LEVELS.includes(level);
}

/** Remove leads from the pipeline (same tiers as customer delete). */
export function canDeleteLead(role: UserRole, permissionLevel?: PermissionLevel) {
  return canDeleteCustomer(role, permissionLevel);
}

export function leadStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function roleLabel(role: UserRole) {
  return role.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Inbox respond / delete / close — anyone except read-only viewers. */
export function canInteractWithInbox(role: UserRole) {
  if (role === "viewer") return false;
  return (
    hasPermission(role, "view:customers") ||
    hasPermission(role, "manage:tasks") ||
    hasPermission(role, "manage:leads") ||
    hasPermission(role, "manage:users")
  );
}
