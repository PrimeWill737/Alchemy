"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmStore } from "@/store/use-crm-store";
import type { Task } from "@/types/crm";

const schema = z.object({
  title: z.string().min(3, "Task title is required"),
  dueDate: z.string().min(1, "Due date is required"),
  assignee: z.string().min(1, "Assignee is required"),
  priority: z.enum(["low", "medium", "high"]),
});

type Values = z.infer<typeof schema>;

export function TaskForm() {
  const addTask = useCrmStore((state) => state.addTask);
  const users = useCrmStore((state) => state.users);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: values.title,
          dueDate: values.dueDate,
          assignee: values.assignee,
          status: "todo",
          priority: values.priority,
        }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        addTask(data.task as Task);
      } else {
        addTask({
          id: `t-${crypto.randomUUID()}`,
          title: values.title,
          dueDate: values.dueDate,
          assignee: values.assignee,
          status: "todo",
          priority: values.priority,
        });
      }
    } catch {
      addTask({
        id: `t-${crypto.randomUUID()}`,
        title: values.title,
        dueDate: values.dueDate,
        assignee: values.assignee,
        status: "todo",
        priority: values.priority,
      });
    }
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Task Title" error={errors.title?.message} {...register("title")} />
      <Input label="Due Date" type="date" error={errors.dueDate?.message} {...register("dueDate")} />
      <label>
        <span>Assign To</span>
        <select {...register("assignee")} defaultValue="">
          <option value="" disabled>
            Select a teammate
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {errors.assignee ? <small>{errors.assignee.message}</small> : null}
      </label>
      <label>
        <span>Priority</span>
        <select {...register("priority")} defaultValue="medium">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <Button type="submit">Add and Assign Task</Button>
    </form>
  );
}
