"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "./login-form.module.scss";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(6, "Enter your password or the one-time code from your invite email"),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Values) => {
    const response = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError("email", { type: "manual", message: "Invalid email or password" });
      setError("password", { type: "manual", message: "Invalid email or password" });
      return;
    }
    const data = (await response.json()) as { mustChangePassword?: boolean };
    if (data.mustChangePassword) {
      router.push("/settings");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <Input label="Work email" type="email" error={errors.email?.message} {...register("email")} />
      <Input
        label="Password or one-time code"
        type="password"
        error={errors.password?.message}
        {...register("password")}
      />
      <p className={styles.hint}>
        Team members: use the one-time password from your invite email on first sign-in, then set a new password in
        Settings.
      </p>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</Button>
      <div className={styles.inlineLinks}>
        <Link href="/auth/forgot">Forgot password?</Link>
        <Link href="/auth/signup">Create admin account</Link>
      </div>
      {isSubmitSuccessful ? <p className={styles.success}>Session initialized.</p> : null}
    </form>
  );
}
