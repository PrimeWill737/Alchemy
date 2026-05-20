import { getAppName, getAppPublicUrl } from "@/lib/email/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { taskAssignedEmailHtml, taskReminderEmailHtml } from "@/lib/email/templates";

export function canSendTaskReminder(role: string): boolean {
  return role === "super_admin" || role === "admin" || role === "sales_manager";
}

export async function sendTaskAssignedEmail(opts: {
  assigneeEmail: string;
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
}) {
  const tasksUrl = `${getAppPublicUrl()}/tasks`;
  await sendTransactionalEmail({
    to: opts.assigneeEmail,
    subject: `${opts.assignerName} assigned you a task on ${getAppName()}`,
    html: taskAssignedEmailHtml({
      assigneeName: opts.assigneeName,
      assignerName: opts.assignerName,
      taskTitle: opts.taskTitle,
      dueDate: opts.dueDate,
      priority: opts.priority,
      tasksUrl,
    }),
  });
}

export async function sendTaskReminderEmail(opts: {
  assigneeEmail: string;
  assigneeName: string;
  senderName: string;
  taskTitle: string;
  dueDate: string;
  status: string;
}) {
  const tasksUrl = `${getAppPublicUrl()}/tasks`;
  await sendTransactionalEmail({
    to: opts.assigneeEmail,
    subject: `Reminder: ${opts.taskTitle} — ${getAppName()}`,
    html: taskReminderEmailHtml({
      assigneeName: opts.assigneeName,
      senderName: opts.senderName,
      taskTitle: opts.taskTitle,
      dueDate: opts.dueDate,
      status: opts.status,
      tasksUrl,
    }),
  });
}
