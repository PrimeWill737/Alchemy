"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthThemeBar } from "@/app/auth/auth-theme-bar";
import styles from "../auth.module.scss";

const requestSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "Enter the 6-digit OTP"),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

type RequestValues = z.infer<typeof requestSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<"request" | "reset">("request");
  const [feedback, setFeedback] = useState("");

  const requestForm = useForm<RequestValues>({ resolver: zodResolver(requestSchema) });
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  const requestOtp = async (values: RequestValues) => {
    setFeedback("");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json().catch(() => ({}));
    setFeedback(data.message ?? "If your email exists, a code was sent.");
    resetForm.setValue("email", values.email);
    setPhase("reset");
  };

  const resetPassword = async (values: ResetValues) => {
    setFeedback("");
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback(data.message ?? "Unable to reset password.");
      return;
    }
    setFeedback("Password reset complete. You can now sign in.");
  };

  return (
    <main className={styles.page}>
      <AuthThemeBar />
      <div className={styles.wrapper}>
        <Card>
          <h1 className={styles.heading}>Reset your password</h1>
          <p className={styles.subheading}>We will send a one-time verification code to your email.</p>
          {phase === "request" ? (
            <form className={styles.formGrid} onSubmit={requestForm.handleSubmit(requestOtp)}>
              <Input label="Email address" type="email" error={requestForm.formState.errors.email?.message} {...requestForm.register("email")} />
              <Button type="submit" disabled={requestForm.formState.isSubmitting}>
                {requestForm.formState.isSubmitting ? "Sending..." : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form className={styles.formGrid} onSubmit={resetForm.handleSubmit(resetPassword)}>
              <Input label="Email address" type="email" error={resetForm.formState.errors.email?.message} {...resetForm.register("email")} />
              <Input label="OTP code" error={resetForm.formState.errors.otp?.message} {...resetForm.register("otp")} />
              <Input label="New password" type="password" error={resetForm.formState.errors.newPassword?.message} {...resetForm.register("newPassword")} />
              <Button type="submit" disabled={resetForm.formState.isSubmitting}>
                {resetForm.formState.isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
          {feedback ? <p className={styles.successText}>{feedback}</p> : null}
          <div className={styles.linksRow}>
            <Link href="/auth">Back to login</Link>
            <button type="button" className={styles.textButton} onClick={() => setPhase(phase === "request" ? "reset" : "request")}>
              {phase === "request" ? "I already have an OTP" : "Request a new OTP"}
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}
