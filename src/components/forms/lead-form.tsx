"use client";

import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCrmStore } from "@/store/use-crm-store";
import type { Lead } from "@/types/crm";
import styles from "./lead-form.module.scss";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  source: z.string().min(2, "Source is required"),
  value: z
    .string()
    .min(1, "Value is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, "Value must be positive"),
});

type Values = z.infer<typeof schema>;

export function LeadForm() {
  const addLead = useCrmStore((state) => state.addLead);
  const leadSources = useCrmStore((state) => state.leadSources);
  const { id: currentUserId } = useCurrentUser();
  const { register, handleSubmit, formState: { errors }, reset, setValue, getValues } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      source: "",
      value: "",
    },
  });

  useEffect(() => {
    const first = leadSources[0]?.name;
    if (!first) return;
    const current = getValues("source");
    if (!leadSources.some((s) => s.name === current)) {
      setValue("source", first);
    }
  }, [leadSources, getValues, setValue]);

  const onSubmit = async (values: Values) => {
    const assignee = currentUserId || "";
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: values.name,
          source: values.source,
          value: Number(values.value),
          status: "new",
          assignedTo: assignee,
        }),
      });
      const data = await res.json();
      if (res.ok && data.lead) {
        addLead(data.lead as Lead);
      } else {
        const lead: Lead = {
          id: `l-${crypto.randomUUID()}`,
          name: values.name,
          source: values.source,
          value: Number(values.value),
          status: "new",
          assignedTo: assignee,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        addLead(lead);
      }
    } catch {
      addLead({
        id: `l-${crypto.randomUUID()}`,
        name: values.name,
        source: values.source,
        value: Number(values.value),
        status: "new",
        assignedTo: assignee,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
    reset({
      name: "",
      source: leadSources[0]?.name ?? values.source,
      value: "",
    });
  };

  if (!leadSources.length) {
    return <p className={styles.hint}>Add at least one lead source in the panel beside this form before creating leads.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Lead Name" error={errors.name?.message} {...register("name")} />
      <label className={styles.field} htmlFor="lead-source-select">
        <span>Lead Source</span>
        <select
          id="lead-source-select"
          className={styles.select}
          aria-invalid={errors.source ? true : undefined}
          {...register("source")}
        >
          {leadSources.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {errors.source?.message ? <small className={styles.fieldError}>{errors.source.message}</small> : null}
      <Input label="Lead Value" type="number" error={errors.value?.message} {...register("value")} />
      <Button type="submit">Create Lead</Button>
    </form>
  );
}
