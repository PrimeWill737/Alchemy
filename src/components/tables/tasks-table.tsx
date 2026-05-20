"use client";

import { useState, type ReactNode } from "react";
import { SimpleTable } from "@/components/ui/simple-table";
import { Button } from "@/components/ui/button";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canSendTaskReminder } from "@/lib/task-notifications";

export function TasksTable() {
  const tasks = useCrmStore((state) => state.tasks);
  const users = useCrmStore((state) => state.users);
  const updateTaskStatus = useCrmStore((state) => state.updateTaskStatus);
  const currentUser = useCurrentUser();
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindMessage, setRemindMessage] = useState<string | null>(null);
  const userMap = new Map(users.map((user) => [user.id, user.name]));
  const canRemind = canSendTaskReminder(currentUser.role);

  const sendReminder = async (taskId: string) => {
    setRemindingId(taskId);
    setRemindMessage(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/remind`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRemindMessage(typeof data.error === "string" ? data.error : "Could not send reminder.");
        return;
      }
      setRemindMessage("Reminder email sent.");
    } catch {
      setRemindMessage("Could not send reminder.");
    } finally {
      setRemindingId(null);
    }
  };

  return (
    <>
      {remindMessage ? <p>{remindMessage}</p> : null}
      <SimpleTable
        headers={["Task", "Assignee", "Due", "Priority", "Status", ...(canRemind ? ["Actions"] : [])]}
        rows={tasks.map((task) => {
          const row: ReactNode[] = [
            task.title,
            userMap.get(task.assignee) ?? task.assignee,
            task.dueDate,
            task.priority,
            <select
              key={`${task.id}-status`}
              value={task.status}
              onChange={(event) => {
                const status = event.target.value as typeof task.status;
                updateTaskStatus(task.id, status);
                void fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ status }),
                });
              }}
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>,
          ];
          if (canRemind) {
            row.push(
              <Button
                key={`${task.id}-remind`}
                type="button"
                variant="secondary"
                disabled={remindingId === task.id || !task.assignee}
                onClick={() => void sendReminder(task.id)}
              >
                {remindingId === task.id ? "Sending…" : "Remind"}
              </Button>,
            );
          }
          return row;
        })}
      />
    </>
  );
}
