import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  deactivateUserInOrganization,
  getDefaultOrganizationId,
  getUserDeactivationTarget,
  getUserOrgAccess,
} from "@/lib/db-users";
import { getSessionFromRequest } from "@/lib/request-session";
import { canDeactivateUser } from "@/lib/user-deactivation";
import { getAppName } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { workspaceAccessRemovedEmailHtml } from "@/lib/email/templates";
import { mockUsers } from "@/lib/mock-db";
import { isUuid } from "@/lib/uuid";
import type { User } from "@/types/crm";

function targetFromMock(userId: string): User | undefined {
  return mockUsers.find((u) => u.id === userId);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: targetId } = await context.params;
  if (!targetId?.trim()) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  if (targetId === session.userId) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 8) {
    return NextResponse.json(
      { error: "A reason of at least 8 characters is required; it is emailed to the user." },
      { status: 400 },
    );
  }

  const db = getDb();
  const actorNameForEmail = session.userId;

  if (db) {
    if (!isUuid(targetId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const orgId = await getDefaultOrganizationId();
    if (!orgId) {
      return NextResponse.json({ error: "Organization not configured" }, { status: 400 });
    }
    const access = await getUserOrgAccess(session.userId);
    if (!access || access.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await getUserDeactivationTarget(orgId, targetId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!canDeactivateUser(access.role, session.userId, target)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actorRow = await getUserDeactivationTarget(orgId, session.userId);
    const removedByName = actorRow?.name ?? actorNameForEmail;

    const ok = await deactivateUserInOrganization(orgId, targetId);
    if (!ok) {
      return NextResponse.json({ error: "Could not remove user" }, { status: 500 });
    }

    await sendTransactionalEmail({
      to: target.email,
      subject: `Your ${getAppName()} workspace access has been removed`,
      html: workspaceAccessRemovedEmailHtml({
        name: target.name,
        removedBy: removedByName,
        reason,
      }),
    });

    return NextResponse.json({ success: true });
  }

  const target = targetFromMock(targetId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!canDeactivateUser(session.role, session.userId, target)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actor = mockUsers.find((u) => u.id === session.userId);
  const removedByName = actor?.name ?? actorNameForEmail;

  await sendTransactionalEmail({
    to: target.email,
    subject: `Your ${getAppName()} workspace access has been removed`,
    html: workspaceAccessRemovedEmailHtml({
      name: target.name,
      removedBy: removedByName,
      reason,
    }),
  });

  return NextResponse.json({ success: true, source: "mock" as const });
}
