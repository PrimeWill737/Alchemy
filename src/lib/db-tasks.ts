import type { Task, TaskStatus } from "@/types/crm";
import { query } from "@/lib/db";

type TaskRow = {
  id: string;
  title: string;
  due_date: Date | string | null;
  assignee_id: string | null;
  status: string;
  priority: string;
};

function formatDueDate(dueDate: Date | string | null): string {
  if (!dueDate) return "";
  if (dueDate instanceof Date) return dueDate.toISOString().slice(0, 10);
  return String(dueDate).slice(0, 10);
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: formatDueDate(row.due_date),
    assignee: row.assignee_id ?? "",
    status: row.status as TaskStatus,
    priority: row.priority as Task["priority"],
  };
}

export async function listTasks(organizationId: string): Promise<Task[]> {
  const { rows } = await query<TaskRow>(
    `SELECT id, title, due_date, assignee_id, status::text, priority::text
     FROM tasks
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY due_date ASC NULLS LAST, created_at DESC`,
    [organizationId],
  );
  return rows.map(rowToTask);
}

export type CreateTaskInput = {
  organizationId: string;
  title: string;
  dueDate?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: Task["priority"];
  createdBy?: string;
};

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { rows } = await query<TaskRow>(
    `INSERT INTO tasks (
       organization_id, title, due_date, assignee_id, status, priority, created_by
     )
     VALUES (
       $1, $2, $3::date, $4,
       COALESCE($5::task_status, 'todo'::task_status),
       COALESCE($6::task_priority, 'medium'::task_priority),
       $7
     )
     RETURNING id, title, due_date, assignee_id, status::text, priority::text`,
    [
      input.organizationId,
      input.title,
      input.dueDate || null,
      input.assigneeId ?? null,
      input.status ?? "todo",
      input.priority ?? "medium",
      input.createdBy ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create task");
  return rowToTask(row);
}

export type TaskDetail = Task & {
  assigneeEmail: string | null;
  assigneeName: string | null;
};

export async function getTaskById(organizationId: string, taskId: string): Promise<TaskDetail | null> {
  const { rows } = await query<TaskRow & { assignee_email: string | null; assignee_name: string | null }>(
    `SELECT t.id, t.title, t.due_date, t.assignee_id, t.status::text, t.priority::text,
            u.email AS assignee_email, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.organization_id = $1 AND t.id = $2::uuid AND t.deleted_at IS NULL
     LIMIT 1`,
    [organizationId, taskId],
  );
  const row = rows[0];
  if (!row) return null;
  const task = rowToTask(row);
  return {
    ...task,
    assigneeEmail: row.assignee_email,
    assigneeName: row.assignee_name,
  };
}

export async function updateTaskStatus(
  organizationId: string,
  taskId: string,
  status: TaskStatus,
): Promise<Task | null> {
  const { rows } = await query<TaskRow>(
    `UPDATE tasks
     SET status = $3::task_status, updated_at = NOW()
     WHERE id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL
     RETURNING id, title, due_date, assignee_id, status::text, priority::text`,
    [taskId, organizationId, status],
  );
  return rows[0] ? rowToTask(rows[0]) : null;
}
