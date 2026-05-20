"use client";

import { useEffect } from "react";
import { z } from "zod";
import {
  Controller,
  type Control,
  type FieldErrors,
  useFieldArray,
  useForm,
  useWatch,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { HiveTeam } from "@/types/crm";
import {
  COMPANY_ROLE_PRESET_VALUES,
  getCompanyRoleOptions,
  PERMISSION_LEVEL_OPTIONS,
  PERMISSION_LEVEL_VALUES,
  resolveSystemRole,
} from "@/lib/company-roles";
import hiveStyles from "./hive-team-form.module.scss";

const memberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Member name is required"),
  companyRolePreset: z.enum(COMPANY_ROLE_PRESET_VALUES),
  customCompanyRole: z.string().optional(),
  permissionLevel: z.enum(PERMISSION_LEVEL_VALUES),
  isLeader: z.boolean(),
});

const schema = z
  .object({
    department: z.string().min(2, "Department name is required"),
    expectedMembers: z.number().min(1, "At least 1 member"),
    members: z.array(memberSchema).min(1, "At least one member is required"),
  })
  .superRefine((values, ctx) => {
    const leaderCount = values.members.filter((member) => member.isLeader).length;
    if (leaderCount < 1 || leaderCount > 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each team must have one to two team leaders",
        path: ["members"],
      });
    }

    if (values.members.length !== values.expectedMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Members list must match expected member count",
        path: ["expectedMembers"],
      });
    }

    values.members.forEach((member, index) => {
      if (member.companyRolePreset === "other") {
        if (!member.customCompanyRole || member.customCompanyRole.trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Custom role name required",
            path: ["members", index, "customCompanyRole"],
          });
        }
      }
    });
  });

type Values = z.infer<typeof schema>;

function blankMember() {
  return {
    id: "",
    name: "",
    companyRolePreset: "sales_representative" as const,
    permissionLevel: "standard" as const,
    customCompanyRole: "",
    isLeader: false,
  };
}

function HiveMemberRow({
  index,
  control,
  register,
  errors,
  includeSuperAdminPreset,
}: {
  index: number;
  control: Control<Values>;
  register: UseFormRegister<Values>;
  errors: FieldErrors<Values>;
  includeSuperAdminPreset: boolean;
}) {
  const preset = useWatch({ control, name: `members.${index}.companyRolePreset` });
  const roleOptions = getCompanyRoleOptions(includeSuperAdminPreset);
  const memberErrors = errors.members?.[index];

  const leaderInputId = `hive-member-${index}-team-leader`;

  return (
    <div className={hiveStyles.memberBlock}>
      <Input
        label={`Member ${index + 1} name`}
        error={memberErrors?.name?.message}
        {...register(`members.${index}.name`)}
      />
      <Input label={`Member ${index + 1} ID (optional)`} {...register(`members.${index}.id`)} />
      <label>
        <span>Company role</span>
        <select {...register(`members.${index}.companyRolePreset`)}>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {preset === "other" ? (
        <>
          <Input
            label="Custom role name"
            error={memberErrors?.customCompanyRole?.message}
            {...register(`members.${index}.customCompanyRole`)}
          />
          <label>
            <span>Permission level (set by admin)</span>
            <select {...register(`members.${index}.permissionLevel`)}>
              {PERMISSION_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <label>
          <span>Permission level (set by admin)</span>
          <select {...register(`members.${index}.permissionLevel`)}>
            {PERMISSION_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={hiveStyles.checkboxRow}>
        <Controller
          name={`members.${index}.isLeader`}
          control={control}
          render={({ field: { value, onChange, ref } }) => (
            <input
              id={leaderInputId}
              ref={ref}
              type="checkbox"
              className={hiveStyles.checkboxInput}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
            />
          )}
        />
        <label htmlFor={leaderInputId} className={hiveStyles.checkboxLabel}>
          Team leader
          <span className={hiveStyles.checkboxHint}>Select 1–2 people as leaders for this hive.</span>
        </label>
      </div>
    </div>
  );
}

export function HiveTeamForm() {
  const addTeam = useCrmStore((state) => state.addTeam);
  const recordGovernanceEvent = useCrmStore((state) => state.recordGovernanceEvent);
  const currentUser = useCurrentUser();
  const includeSuperAdminPreset = currentUser.role === "super_admin";
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: "",
      expectedMembers: 3,
      members: [blankMember(), blankMember(), blankMember()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "members" });
  const expectedMembers = useWatch({ control, name: "expectedMembers" });

  useEffect(() => {
    if (!expectedMembers || expectedMembers < 1) return;
    if (fields.length < expectedMembers) {
      for (let i = fields.length; i < expectedMembers; i += 1) append(blankMember());
      return;
    }
    if (fields.length > expectedMembers) {
      for (let i = fields.length; i > expectedMembers; i -= 1) remove(i - 1);
    }
  }, [append, expectedMembers, fields.length, remove]);

  const onSubmit = (values: Values) => {
    const team: HiveTeam = {
      id: `team-${crypto.randomUUID()}`,
      department: values.department,
      expectedMembers: values.expectedMembers,
      members: values.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: resolveSystemRole(m.companyRolePreset, m.permissionLevel),
        companyRolePreset: m.companyRolePreset,
        customCompanyRole: m.companyRolePreset === "other" ? m.customCompanyRole?.trim() : undefined,
        permissionLevel: m.permissionLevel,
        isLeader: m.isLeader,
      })),
      createdByRole: currentUser.role,
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    addTeam(team);
    recordGovernanceEvent({
      kind: "hive_created",
      summary: `${currentUser.name} created hive "${values.department}" with ${values.expectedMembers} members (${values.members.filter((m) => m.isLeader).length} leader(s)).`,
      actorName: currentUser.name,
      targetName: values.department,
    });
    reset({
      department: "",
      expectedMembers: 3,
      members: [blankMember(), blankMember(), blankMember()],
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Department name" error={errors.department?.message} {...register("department")} />
      <Input
        label="How many members?"
        type="number"
        min={1}
        error={errors.expectedMembers?.message}
        {...register("expectedMembers", { valueAsNumber: true })}
      />
      <div>
        <strong>Team members</strong>
      </div>
      {fields.map((field, index) => (
        <HiveMemberRow
          key={field.id}
          index={index}
          control={control}
          register={register}
          errors={errors}
          includeSuperAdminPreset={includeSuperAdminPreset}
        />
      ))}
      {errors.members && "message" in errors.members ? (
        <p className={hiveStyles.leaderError} role="alert">
          {errors.members.message as string}
        </p>
      ) : null}
      <Button type="submit">Create hive team</Button>
    </form>
  );
}
