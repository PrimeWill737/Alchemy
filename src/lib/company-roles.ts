import type { PermissionLevel, UserRole } from "@/types/crm";

export type CompanyRolePresetValue =
  | "super_admin"
  | "admin"
  | "marketer"
  | "sales_manager"
  | "sales_representative"
  | "support_agent"
  | "viewer"
  | "finance"
  | "hr"
  | "operations"
  | "legal"
  | "executive_assistant"
  | "intern"
  | "other";

export type CompanyRoleOption = {
  value: CompanyRolePresetValue;
  label: string;
  systemRole: UserRole;
};

/** Presets a company might use; systemRole is the CRM permission template. */
export const COMPANY_ROLE_OPTIONS: CompanyRoleOption[] = [
  { value: "super_admin", label: "Super Admin", systemRole: "super_admin" },
  { value: "admin", label: "Admin", systemRole: "admin" },
  { value: "marketer", label: "Marketer", systemRole: "marketer" },
  { value: "sales_manager", label: "Sales Manager", systemRole: "sales_manager" },
  { value: "sales_representative", label: "Sales Representative", systemRole: "sales_representative" },
  { value: "support_agent", label: "Support Agent", systemRole: "support_agent" },
  { value: "viewer", label: "Viewer / Read-only", systemRole: "viewer" },
  { value: "finance", label: "Finance", systemRole: "viewer" },
  { value: "hr", label: "Human Resources", systemRole: "admin" },
  { value: "operations", label: "Operations", systemRole: "sales_manager" },
  { value: "legal", label: "Legal / Compliance", systemRole: "viewer" },
  { value: "executive_assistant", label: "Executive Assistant", systemRole: "sales_representative" },
  { value: "intern", label: "Intern / Trainee", systemRole: "viewer" },
  { value: "other", label: "Other (custom role)", systemRole: "viewer" },
];

export const COMPANY_ROLE_PRESET_VALUES = COMPANY_ROLE_OPTIONS.map((o) => o.value) as [
  CompanyRolePresetValue,
  ...CompanyRolePresetValue[],
];

export const PERMISSION_LEVEL_OPTIONS: { value: PermissionLevel; label: string; description: string }[] = [
  { value: "read_only", label: "Read only", description: "View data; no edits" },
  { value: "limited", label: "Limited", description: "Narrow actions (e.g. assigned records)" },
  { value: "standard", label: "Standard", description: "Typical day-to-day for the role" },
  { value: "elevated", label: "Elevated", description: "Broader access within the function" },
  { value: "full", label: "Full", description: "Widest access for this role type" },
];

export const PERMISSION_LEVEL_VALUES = PERMISSION_LEVEL_OPTIONS.map((o) => o.value) as [
  PermissionLevel,
  ...PermissionLevel[],
];

export function getCompanyRoleOptions(includeSuperAdmin: boolean): CompanyRoleOption[] {
  if (includeSuperAdmin) return COMPANY_ROLE_OPTIONS;
  return COMPANY_ROLE_OPTIONS.filter((o) => o.value !== "super_admin");
}

export function resolveSystemRole(
  companyRolePreset: CompanyRolePresetValue,
  permissionLevel: PermissionLevel,
): UserRole {
  if (companyRolePreset === "other") {
    switch (permissionLevel) {
      case "full":
        return "admin";
      case "elevated":
        return "sales_manager";
      case "standard":
        return "sales_representative";
      case "limited":
        return "support_agent";
      case "read_only":
      default:
        return "viewer";
    }
  }
  const preset = COMPANY_ROLE_OPTIONS.find((o) => o.value === companyRolePreset);
  return preset?.systemRole ?? "viewer";
}

export function companyRoleLabel(
  preset: string | undefined,
  customLabel: string | undefined,
): string {
  if (customLabel?.trim()) return customLabel.trim();
  const found = COMPANY_ROLE_OPTIONS.find((o) => o.value === preset);
  return found?.label ?? preset ?? "Role";
}
