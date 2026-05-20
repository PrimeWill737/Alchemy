"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { TasksTable } from "@/components/tables/tasks-table";
import { TaskForm } from "@/components/forms/task-form";
import styles from "@/app/module-pages.module.scss";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasPermission } from "@/lib/rbac";

export default function TasksPage() {
  const currentUser = useCurrentUser();
  const canManageTasks = hasPermission(currentUser.role, "manage:tasks");

  return (
    <AppShell heading="Tasks" subheading="Activity planning and team follow-ups">
      <section className={styles.splitGrid}>
        <Card>
          <h2>Team Tasks</h2>
          <TasksTable />
        </Card>
        <Card>
          <h2>Add and Assign Task</h2>
          {canManageTasks ? <TaskForm /> : <p>Your role has read-only access for tasks.</p>}
        </Card>
      </section>
    </AppShell>
  );
}
