"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthThemeBar } from "@/app/auth/auth-theme-bar";
import styles from "../auth.module.scss";
import type { PublicSignupPlan } from "@/lib/db-signup-plans";
import { formatSignupPlanForDisplay } from "@/lib/signup-plan-quote";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
  companyName: z.string().min(2, "Enter company name"),
  roleTitle: z.string().min(2, "Enter your role"),
  planId: z.string().uuid("Choose a plan"),
  phone: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function SignupPageInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [plans, setPlans] = useState<PublicSignupPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { planId: "" },
  });

  const selectedPlanId = watch("planId");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlansLoading(true);
      try {
        const res = await fetch("/api/public/signup-plans");
        const data = await res.json().catch(() => ({}));
        const list: PublicSignupPlan[] = Array.isArray(data.plans) ? data.plans : [];
        if (cancelled) return;
        setPlans(list);
        const q = searchParams.get("plan");
        if (q && list.some((p) => p.id === q)) {
          setValue("planId", q);
        } else if (list[0]) {
          setValue("planId", list[0].id);
        }
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setValue]);

  const onSubmit = async (values: Values) => {
    setMessage("");
    setError("");
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.message ?? "Unable to create account.");
      return;
    }
    setMessage("Account created. You can now sign in.");
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <main className={styles.page}>
      <AuthThemeBar />
      <div className={styles.wrapper}>
        <Card>
          <Link href="/" className={styles.backLink}>
            ← Back to home
          </Link>
          <h1 className={styles.heading}>Create admin account</h1>
          <p className={styles.subheading}>
            Choose the plan published by your workspace. Tier and Naira pricing are set by your super admin and apply
            automatically.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.formGrid}>
            <Input label="Full name" error={errors.fullName?.message} {...register("fullName")} />
            <Input label="Business email" type="email" error={errors.email?.message} {...register("email")} />
            <Input label="Password" type="password" error={errors.password?.message} {...register("password")} />
            <Input label="Company name" error={errors.companyName?.message} {...register("companyName")} />
            <Input label="Role title" error={errors.roleTitle?.message} {...register("roleTitle")} />

            <fieldset className={styles.planFieldset}>
              <legend>Plan</legend>
              {plansLoading ? <p className={styles.planHint}>Loading plans…</p> : null}
              {!plansLoading && plans.length === 0 ? (
                <p className={styles.planHint}>
                  No plans are available yet. Ask a super admin to publish plans in Control Center, then refresh this
                  page.
                </p>
              ) : null}
              {!plansLoading && plans.length > 0 ? (
                <div className={styles.planOptions}>
                  {plans.map((p) => (
                    <label key={p.id} className={styles.planOption}>
                      <input type="radio" value={p.id} {...register("planId")} />
                      <span>
                        <strong>{p.name}</strong>
                        <span className={styles.planOptionMeta}>{formatSignupPlanForDisplay(p)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {errors.planId ? <p className={styles.errorText}>{errors.planId.message}</p> : null}
              {selectedPlan ? (
                <p className={styles.planHint}>
                  You are signing up for <strong>{selectedPlan.name}</strong> at{" "}
                  <strong>{formatSignupPlanForDisplay(selectedPlan)}</strong> (NGN).
                </p>
              ) : null}
            </fieldset>

            <Input label="Phone (optional)" error={errors.phone?.message} {...register("phone")} />
            <Button type="submit" disabled={isSubmitting || plans.length === 0}>{isSubmitting ? "Creating..." : "Create account"}</Button>
          </form>
          {error ? <p className={styles.errorText}>{error}</p> : null}
          {message ? <p className={styles.successText}>{message}</p> : null}
          <div className={styles.linksRow}>
            <Link href="/auth">Back to login</Link>
            <Link href="/auth/forgot">Forgot password</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={(
        <main className={styles.page}>
          <AuthThemeBar />
          <div className={styles.wrapper}>
            <Card>
              <p className={styles.subheading}>Loading signup…</p>
            </Card>
          </div>
        </main>
      )}
    >
      <SignupPageInner />
    </Suspense>
  );
}
