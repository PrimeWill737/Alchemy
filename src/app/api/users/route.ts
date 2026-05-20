import { NextRequest, NextResponse } from "next/server";
import { mockUsers } from "@/lib/mock-db";
import { createUser, getUserOrgAccess, listUsersByOrganization } from "@/lib/db-users";
import { generateLoginOtpCode, issueUserLoginOtp } from "@/lib/db-auth";
import { getDb } from "@/lib/db";
import { getAppPublicUrl, getAppName } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { inviteLoginOtpEmailHtml } from "@/lib/email/templates";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import { isUuid } from "@/lib/uuid";
import type { PermissionLevel, User, UserRole } from "@/types/crm";

const PERMISSION_LEVELS: PermissionLevel[] = ["read_only", "limited", "standard", "elevated", "full"];

function isPermissionLevel(value: unknown): value is PermissionLevel {
  return typeof value === "string" && PERMISSION_LEVELS.includes(value as PermissionLevel);
}

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    [
      "super_admin",
      "admin",
      "marketer",
      "sales_manager",
      "sales_representative",
      "support_agent",
      "viewer",
    ].includes(value)
  );
}

export async function GET(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, users: mockUsers });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, users: mockUsers });
    }
    const users = await listUsersByOrganization(orgId);
    return NextResponse.json({ source: "db" as const, users });
  } catch {
    return NextResponse.json({ source: "mock" as const, users: mockUsers });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<User> & {
    companyRolePreset?: string;
    customCompanyRole?: string;
    permissionLevel?: PermissionLevel;
  };

  if (!body.name || !body.email || !isUserRole(body.role) || !isPermissionLevel(body.permissionLevel)) {
    return NextResponse.json({ error: "Invalid user payload" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    const user: User = {
      id: body.id ?? `u-${crypto.randomUUID()}`,
      name: body.name,
      email: body.email,
      role: body.role,
      createdAt: body.createdAt ?? new Date().toISOString().slice(0, 10),
      supervisingAdminId: body.supervisingAdminId,
      companyRolePreset: body.companyRolePreset,
      customCompanyRole: body.customCompanyRole,
      permissionLevel: body.permissionLevel,
    };
    return NextResponse.json({ source: "mock" as const, user }, { status: 201 });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization. Run database/seed.sql and set CRM_DEFAULT_ORGANIZATION_ID in .env" },
        { status: 400 },
      );
    }

    const supervising =
      typeof body.supervisingAdminId === "string" && isUuid(body.supervisingAdminId)
        ? body.supervisingAdminId
        : undefined;

    const user = await createUser({
      organizationId: orgId,
      name: body.name,
      email: body.email,
      role: body.role,
      companyRolePreset: body.companyRolePreset ?? body.role,
      customCompanyRole: body.customCompanyRole,
      permissionLevel: body.permissionLevel,
      supervisingAdminId: supervising,
    });

    const otpCode = generateLoginOtpCode();
    await issueUserLoginOtp(user.id, user.email, otpCode);
    const loginUrl = `${getAppPublicUrl()}/auth`;
    await sendTransactionalEmail({
      to: user.email,
      subject: `Your ${getAppName()} workspace invite`,
      html: inviteLoginOtpEmailHtml({
        name: user.name,
        email: user.email,
        code: otpCode,
        loginUrl,
      }),
    });

    return NextResponse.json({ source: "db" as const, user }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
