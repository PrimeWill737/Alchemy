import type { NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  AUTH_ROLE_COOKIE_NAME,
  AUTH_USER_ID_COOKIE_NAME,
} from "@/lib/auth";
import type { UserRole } from "@/types/crm";

export function getSessionFromRequest(request: NextRequest): {
  userId: string;
  role: UserRole;
} | null {
  if (request.cookies.get(AUTH_COOKIE_NAME)?.value !== AUTH_COOKIE_VALUE) return null;
  const userId = request.cookies.get(AUTH_USER_ID_COOKIE_NAME)?.value?.trim() ?? "";
  const roleRaw = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value ?? "";
  if (!userId || !roleRaw) return null;
  return { userId, role: roleRaw as UserRole };
}
