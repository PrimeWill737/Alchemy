"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Customer } from "@/types/crm";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Phone is required"),
  company: z.string().min(2, "Company is required"),
  assignedTo: z.string().min(1, "Owner is required"),
});

type Values = z.infer<typeof schema>;

export function CustomerForm() {
  const currentUser = useCurrentUser();
  const addCustomer = useCrmStore((state) => state.addCustomer);
  const users = useCrmStore((state) => state.users);
  const profile = users.find((user) => user.id === currentUser.id);
  const supervisingAdminId =
    currentUser.role === "admin"
      ? currentUser.id || undefined
      : profile?.supervisingAdminId;
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      company: values.company,
      assignedTo: values.assignedTo,
      createdByUserId: currentUser.id || undefined,
      supervisingAdminId,
    };
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        addCustomer(data.customer as Customer);
      } else {
        addCustomer({
          id: `c-${crypto.randomUUID()}`,
          ...payload,
          status: "active",
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    } catch {
      addCustomer({
        id: `c-${crypto.randomUUID()}`,
        ...payload,
        status: "active",
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Customer Name" error={errors.name?.message} {...register("name")} />
      <Input label="Company" error={errors.company?.message} {...register("company")} />
      <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
      <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
      <label>
        <span>Account Owner</span>
        <select {...register("assignedTo")} defaultValue="">
          <option value="" disabled>
            Select an owner
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        {errors.assignedTo ? <small>{errors.assignedTo.message}</small> : null}
      </label>
      <Button type="submit">Add Customer</Button>
    </form>
  );
}
