import type { UserRole } from "@/types/crm";

export type DeactivationTarget = {
  id: string;
  role: UserRole;
  supervisingAdminId?: string | null;
};

/** Super admins may deactivate anyone except themselves. Admins may only deactivate users they supervise. */
export function canDeactivateUser(actorRole: UserRole, actorUserId: string, target: DeactivationTarget): boolean {
  if (target.id === actorUserId) return false;
  if (actorRole === "super_admin") return true;
  if (actorRole === "admin") {
    return target.supervisingAdminId === actorUserId;
  }
  return false;
}
