import type { NextRequest } from "next/server";
import { getDefaultOrganizationId, getUserOrgAccess } from "@/lib/db-users";
import { getSessionFromRequest } from "@/lib/request-session";

/** Workspace org for the signed-in user, or default org for super admin / unscoped demo. */
export async function resolveOrganizationId(request: NextRequest): Promise<string | null> {
  const session = getSessionFromRequest(request);
  if (session && session.role !== "super_admin") {
    const access = await getUserOrgAccess(session.userId);
    if (access?.organizationId) return access.organizationId;
  }
  return getDefaultOrganizationId();
}
