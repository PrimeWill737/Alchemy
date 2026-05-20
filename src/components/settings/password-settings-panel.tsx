"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "@/app/module-pages.module.scss";

function readMustResetCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === "crm_must_reset=1");
}

const schema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

type Values = z.infer<typeof schema>;

type Props = {
  forceReset?: boolean;
};

export function PasswordSettingsPanel({ forceReset }: Props) {
  const mustReset = forceReset ?? readMustResetCookie();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: Values) => {
    setServerMessage(null);
    setServerError(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPassword: mustReset ? undefined : values.currentPassword,
        newPassword: values.newPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(typeof data.message === "string" ? data.message : "Could not update password.");
      return;
    }
    setServerMessage(typeof data.message === "string" ? data.message : "Password updated.");
    reset();
    if (typeof document !== "undefined") {
      document.cookie = "crm_must_reset=; path=/; max-age=0";
    }
  };

  return (
    <Card>
      <h2>Password</h2>
      {mustReset ? (
        <p className={styles.metaLine}>
          You signed in with a one-time password. Set a new password below to secure your account.
        </p>
      ) : (
        <p className={styles.metaLine}>
          Update your sign-in password. Use the same email you use on the login page.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {!mustReset ? (
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
        ) : null}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Update password"}
        </Button>
      </form>
      {serverError ? <p className={styles.metaLine}>{serverError}</p> : null}
      {serverMessage ? <p className={styles.metaLine}>{serverMessage}</p> : null}
      {!mustReset ? (
        <p className={styles.metaLine}>
          Forgot your password? Use <a href="/auth/forgot">Forgot password</a> on the sign-in page.
        </p>
      ) : null}
    </Card>
  );
}
