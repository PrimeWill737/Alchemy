"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceBilling } from "@/components/billing/workspace-billing";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useBillingGate } from "@/context/billing-gate-context";
import styles from "@/app/module-pages.module.scss";

export default function SettingsBillingPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { snapshot } = useBillingGate();

  useLayoutEffect(() => {
    if (currentUser.ready && currentUser.role === "super_admin") {
      router.replace("/settings");
    }
  }, [currentUser.ready, currentUser.role, router]);

  if (!currentUser.ready) {
    return (
      <AppShell heading="Billing" subheading="Workspace subscription">
        <Card>
          <p className={styles.metaLine}>Loading…</p>
        </Card>
      </AppShell>
    );
  }

  if (currentUser.role === "super_admin") {
    return (
      <AppShell heading="Control Center" subheading="Redirecting…">
        <Card>
          <p className={styles.metaLine}>Taking you to Control Center…</p>
        </Card>
      </AppShell>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <AppShell heading="Billing" subheading="Workspace subscription">
        <Card>
          <p className={styles.metaLine}>
            Only workspace administrators manage billing. Ask your admin to complete payment if your workspace is locked.
          </p>
          <p className={styles.metaLine}>
            <Link href="/dashboard">Back to dashboard</Link>
          </p>
        </Card>
      </AppShell>
    );
  }

  const adminBillingLocked =
    currentUser.role === "admin" &&
    !snapshot.exempt &&
    (snapshot.loading || snapshot.blocked);

  const showBackLink = !adminBillingLocked;

  return (
    <AppShell heading="Billing" subheading="Workspace subscription and bank transfer.">
      {showBackLink ? (
        <p className={styles.metaLine} style={{ marginBottom: "1rem" }}>
          <Link href="/settings">
            ← Back to Settings
          </Link>
        </p>
      ) : null}
      <WorkspaceBilling autoRedirectWhenClear />
    </AppShell>
  );
}
