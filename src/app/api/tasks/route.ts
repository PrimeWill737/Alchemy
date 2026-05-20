import { NextRequest, NextResponse } from "next/server";
import { mockTasks } from "@/lib/mock-db";
import { createTask, listTasks } from "@/lib/db-tasks";
import { getUserContact } from "@/lib/db-users";
import { getDb } from "@/lib/db";
import { resolveOrganizationId } from "@/lib/resolve-organization";
import { getSessionFromRequest } from "@/lib/request-session";
import { sendTaskAssignedEmail } from "@/lib/task-notifications";
import type { TaskStatus } from "@/types/crm";

const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ source: "mock" as const, tasks: mockTasks });
  }
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ source: "mock" as const, tasks: mockTasks });
    }
    const tasks = await listTasks(orgId);
    return NextResponse.json({ source: "db" as const, tasks });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<{
    title: string;
    dueDate: string;
    assignee: string;
    status: TaskStatus;
    priority: "low" | "medium" | "high";
  }>;

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Invalid task payload" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    const task = {
      id: `t-${crypto.randomUUID()}`,
      title: body.title.trim(),
      dueDate: body.dueDate ?? "",
      assignee: body.assignee ?? session.userId,
      status: (body.status && TASK_STATUSES.includes(body.status) ? body.status : "todo") as TaskStatus,
      priority: body.priority ?? "medium",
    };
    return NextResponse.json({ source: "mock" as const, task }, { status: 201 });
  }

  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: "No organization configured" }, { status: 400 });
    }
    const assigneeId = body.assignee ?? session.userId;
    const task = await createTask({
      organizationId: orgId,
      title: body.title.trim(),
      dueDate: body.dueDate,
      assigneeId,
      status: body.status && TASK_STATUSES.includes(body.status) ? body.status : "todo",
      priority: body.priority,
      createdBy: session.userId,
    });

    if (assigneeId !== session.userId) {
      const [assignee, assigner] = await Promise.all([
        getUserContact(orgId, assigneeId),
        getUserContact(orgId, session.userId),
      ]);
      if (assignee?.email && assigner?.name) {
        await sendTaskAssignedEmail({
          assigneeEmail: assignee.email,
          assigneeName: assignee.name,
          assignerName: assigner.name,
          taskTitle: task.title,
          dueDate: task.dueDate,
          priority: task.priority,
        });
      }
    }

    return NextResponse.json({ source: "db" as const, task }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
