"use client";

import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { User } from "@/types/crm";
import {
  COMPANY_ROLE_PRESET_VALUES,
  getCompanyRoleOptions,
  PERMISSION_LEVEL_OPTIONS,
  PERMISSION_LEVEL_VALUES,
  resolveSystemRole,
} from "@/lib/company-roles";

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Enter a valid email"),
    companyRolePreset: z.enum(COMPANY_ROLE_PRESET_VALUES),
    customCompanyRole: z.string().optional(),
    permissionLevel: z.enum(PERMISSION_LEVEL_VALUES),
  })
  .superRefine((data, ctx) => {
    if (data.companyRolePreset === "other") {
      if (!data.customCompanyRole || data.customCompanyRole.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the custom role name",
          path: ["customCompanyRole"],
        });
      }
    }
  });

type Values = z.infer<typeof schema>;

export function TeamMemberForm() {
  const currentUser = useCurrentUser();
  const addUser = useCrmStore((state) => state.addUser);
  const recordGovernanceEvent = useCrmStore((state) => state.recordGovernanceEvent);
  const roleOptions = getCompanyRoleOptions(currentUser.role === "super_admin");
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyRolePreset: "sales_representative",
      permissionLevel: "standard",
      customCompanyRole: "",
    },
  });

  const companyRolePreset = useWatch({ control, name: "companyRolePreset" });

  const onSubmit = async (values: Values) => {
    const normalized = values.name.toLowerCase().replace(/\s+/g, "-");
    const supervisingAdminId = currentUser.role === "admin" ? currentUser.id : undefined;
    const systemRole = resolveSystemRole(values.companyRolePreset, values.permissionLevel);
    const user: User = {
      id: `u-${normalized}-${crypto.randomUUID()}`,
      name: values.name,
      email: values.email,
      role: systemRole,
      createdAt: new Date().toISOString().slice(0, 10),
      supervisingAdminId,
      companyRolePreset: values.companyRolePreset,
      customCompanyRole:
        values.companyRolePreset === "other" ? values.customCompanyRole?.trim() : undefined,
      permissionLevel: values.permissionLevel,
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const saved = data.user as User;
        addUser(saved);
        recordGovernanceEvent({
          kind: "user_added",
          summary: `${currentUser.name} added ${saved.name} (${saved.role.replace(/_/g, " ")}; permission ${saved.permissionLevel ?? values.permissionLevel}).`,
          actorName: currentUser.name,
          targetName: saved.name,
        });
        reset({
          companyRolePreset: "sales_representative",
          permissionLevel: "standard",
          customCompanyRole: "",
        });
        return;
      }
    } catch {
      /* fall through to local */
    }
    addUser(user);
    recordGovernanceEvent({
      kind: "user_added",
      summary: `${currentUser.name} added ${user.name} (${user.role.replace(/_/g, " ")}; permission ${user.permissionLevel}).`,
      actorName: currentUser.name,
      targetName: user.name,
    });
    reset({
      companyRolePreset: "sales_representative",
      permissionLevel: "standard",
      customCompanyRole: "",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Full Name" error={errors.name?.message} {...register("name")} />
      <Input label="Work Email" type="email" error={errors.email?.message} {...register("email")} />
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
        This email is their login. A one-time password is emailed automatically so they can sign in and set a permanent
        password in Settings.
      </p>
      <label>
        <span>Company role</span>
        <select {...register("companyRolePreset")}>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.companyRolePreset ? <small>{errors.companyRolePreset.message}</small> : null}
      </label>

      {companyRolePreset === "other" ? (
        <>
          <Input
            label="Custom role name"
            error={errors.customCompanyRole?.message}
            {...register("customCompanyRole")}
          />
          <label>
            <span>Permission level (set by admin)</span>
            <select {...register("permissionLevel")}>
              {PERMISSION_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
            {errors.permissionLevel ? <small>{errors.permissionLevel.message}</small> : null}
          </label>
        </>
      ) : (
        <label>
          <span>Permission level (set by admin)</span>
          <select {...register("permissionLevel")}>
            {PERMISSION_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
          {errors.permissionLevel ? <small>{errors.permissionLevel.message}</small> : null}
        </label>
      )}

      <Button type="submit">Add Team Member</Button>
    </form>
  );
}
