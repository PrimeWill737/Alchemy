import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getTaskById } from "@/lib/db-tasks";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import { getUserContact } from "@/lib/db-users";
import { canSendTaskReminder, sendTaskReminderEmail } from "@/lib/task-notifications";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canSendTaskReminder(session.role)) {
    return NextResponse.json({ error: "Only admins and team leaders can send reminders" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, ok: true });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }

    const task = await getTaskById(orgId, id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!task.assigneeEmail || !task.assigneeName) {
      return NextResponse.json({ error: "Task has no assignee with email" }, { status: 400 });
    }

    const sender = await getUserContact(orgId, session.userId);
    const senderName = sender?.name ?? "Your team lead";

    await sendTaskReminderEmail({
      assigneeEmail: task.assigneeEmail,
      assigneeName: task.assigneeName,
      senderName,
      taskTitle: task.title,
      dueDate: task.dueDate,
      status: task.status,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
