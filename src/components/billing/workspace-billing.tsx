"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useBillingGate } from "@/context/billing-gate-context";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { Skeleton, WireCard } from "@/components/ui/skeleton";
import styles from "@/app/module-pages.module.scss";
import wbStyles from "./workspace-billing.module.scss";

function formatPeriodDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type MeResponse = {
  hasAccess?: boolean;
  deactivated?: boolean;
  mode?: string;
  legacyWorkspace?: boolean;
  subscription?: {
    status: string;
    planName: string;
    amountNgn: number;
    isMonthly: boolean;
    periodStart: string | null;
    periodEnd: string | null;
    transferReference: string | null;
    planBenefits?: string[];
  };
  billing?: {
    canSubmitNewOrLapsedPayment: boolean;
    canSubmitEarlyRenewal: boolean;
    awaitingApproval: boolean;
  };
};

type Props = {
  /** When true, redirect to dashboard for demo mode or legacy workspaces without a subscription row. */
  autoRedirectWhenClear?: boolean;
};

export function WorkspaceBilling({ autoRedirectWhenClear = true }: Props) {
  const router = useRouter();
  const { refresh: refreshGate } = useBillingGate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  /** null = follow default (open when early renewal is allowed); explicit true/false after user toggles */
  const [renewalPanelExplicit, setRenewalPanelExplicit] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithTimeout("/api/subscriptions/me", { credentials: "include" }, 12_000);
      const data = (await res.json().catch(() => ({}))) as MeResponse;
      if (data.deactivated) {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/auth?reason=workspace_closed");
        return;
      }
      setMe(data);
      void refreshGate();

      if (autoRedirectWhenClear && data.mode === "demo") {
        router.replace("/dashboard");
        return;
      }

      if (autoRedirectWhenClear && data.hasAccess && !data.subscription && data.legacyWorkspace) {
        router.replace("/dashboard");
        return;
      }
    } catch {
      setError("Could not load billing status.");
    } finally {
      setLoading(false);
    }
  }, [router, refreshGate, autoRedirectWhenClear]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const submitPayment = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/subscriptions/me/submit-payment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferReference: reference.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Submit failed.");
        return;
      }
      setReference("");
      await load();
    } catch {
      setError("Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSubscription = async () => {
    setCancelConfirmOpen(false);
    setCancelling(true);
    setError("");
    try {
      const res = await fetch("/api/subscriptions/me/cancel", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not cancel.");
        return;
      }
      await load();
    } catch {
      setError("Could not cancel.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !me) {
    return (
      <Card>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          aria-busy="true"
          aria-label="Loading billing"
        >
          <Skeleton variant="line" height={22} style={{ width: "38%" }} />
          <Skeleton variant="line" height={14} style={{ width: "92%" }} />
          <Skeleton variant="line" height={14} style={{ width: "70%" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <WireCard />
            <WireCard />
          </div>
          <Skeleton variant="rect" height={100} />
        </div>
      </Card>
    );
  }

  if (me.mode === "super_admin") {
    return (
      <Card>
        <p className={styles.metaLine}>Billing enforcement applies to database-backed workspace admins.</p>
      </Card>
    );
  }

  const sub = me.subscription;
  const billing = me.billing;
  const amountLabel =
    sub && sub.amountNgn > 0
      ? `₦${sub.amountNgn.toLocaleString("en-NG")}`
      : "Custom / per agreement (confirm with super admin)";

  const showPayForm = Boolean(
    billing?.canSubmitNewOrLapsedPayment || billing?.canSubmitEarlyRenewal,
  );
  const showAwaiting = Boolean(billing?.awaitingApproval);
  const canCancel =
    sub &&
    ["active", "payment_submitted", "renewal_submitted", "awaiting_payment", "expired"].includes(sub.status);

  const showSubscriptionManagement =
    Boolean(sub) && (sub!.status === "active" || sub!.status === "renewal_submitted");

  const showBankTransferCard =
    Boolean(sub) &&
    ["awaiting_payment", "payment_submitted", "expired", "cancelled"].includes(sub!.status);

  const benefits = sub?.planBenefits ?? [];
  const awaitingRenewalConfirmation =
    sub?.status === "renewal_submitted" && billing?.awaitingApproval;

  const canRenew = Boolean(billing?.canSubmitEarlyRenewal);
  const renewalSectionOpen = canRenew && (renewalPanelExplicit ?? true);

  const bankDetailsBlock = (
    <>
      <ul className={wbStyles.bankList}>
        <li>
          <strong>Bank name:</strong> GTBank
        </li>
        <li>
          <strong>Account name:</strong> Onoja William Bosworth
        </li>
        <li>
          <strong>Account number:</strong> 0558518751
        </li>
      </ul>
      <p className={styles.metaLine}>
        Send your payment, then submit the reference you used (or a short note) so the super admin can match your
        transfer.
      </p>
    </>
  );

  const payReferenceForm = (
    <div style={{ maxWidth: 420 }}>
      <Input
        label="Transfer reference or note"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="e.g. Your name + date of transfer"
      />
      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Button type="button" onClick={() => void submitPayment()} disabled={submitting || !reference.trim()}>
          {submitting ? "Submitting…" : billing?.canSubmitEarlyRenewal ? "Submit renewal" : "Submit"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel subscription?"
        description="Cancel this workspace subscription? Access will pause until a new payment is approved."
        confirmLabel="Cancel subscription"
        confirmPendingLabel="Cancelling…"
        pending={cancelling}
        onCancel={() => !cancelling && setCancelConfirmOpen(false)}
        onConfirm={() => void cancelSubscription()}
      />

      {showSubscriptionManagement ? (
        <Card className={`${wbStyles.management}`}>
          <p className={wbStyles.kicker}>Active subscription</p>
          <h2>Your plan</h2>
          <p className={styles.metaLine}>
            <strong>{sub!.planName}</strong>
            {" · "}
            <strong>Amount:</strong> {amountLabel}
            {sub!.isMonthly ? " · Billed monthly" : " · One-time"}
          </p>

          <div className={wbStyles.durationBox}>
            <p className={wbStyles.durationLabel}>Subscription period</p>
            {sub!.isMonthly && sub!.periodStart && sub!.periodEnd ? (
              <>
                <p className={wbStyles.durationMain}>
                  {formatPeriodDate(sub!.periodStart)} → {formatPeriodDate(sub!.periodEnd)}
                </p>
                <p className={wbStyles.durationSub}>
                  Access stays on through <strong>{formatPeriodDate(sub!.periodEnd)}</strong> (last day of this
                  period). Renew before then to avoid interruption.
                </p>
              </>
            ) : sub!.isMonthly && sub!.periodEnd ? (
              <p className={wbStyles.durationMain}>
                Valid through <strong>{formatPeriodDate(sub!.periodEnd)}</strong>
              </p>
            ) : (
              <p className={wbStyles.durationMain}>
                Your plan is active. No fixed end date is set for this one-time term.
              </p>
            )}
          </div>

          <p className={wbStyles.benefitsTitle}>What&apos;s included</p>
          {benefits.length > 0 ? (
            <ul className={wbStyles.benefitsList}>
              {benefits.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className={wbStyles.benefitsEmpty}>
              Benefits follow the plan you signed up with. If this list is empty, your plan may have been updated in
              Control Center — your access is unchanged.
            </p>
          )}

          {error ? <p style={{ color: "var(--color-danger, #b91c1c)", marginTop: "0.75rem" }}>{error}</p> : null}

          {awaitingRenewalConfirmation ? (
            <p className={wbStyles.statusNote}>
              <strong>Renewal in progress:</strong> your bank transfer is awaiting super admin confirmation. Current
              access continues through the dates above.
            </p>
          ) : null}

          <div className={wbStyles.actionRow}>
            {canRenew ? (
              <Button
                type="button"
                onClick={() => {
                  const open = renewalSectionOpen;
                  setRenewalPanelExplicit(!open);
                }}
              >
                {renewalSectionOpen ? "Hide renewal form" : "Renew subscription"}
              </Button>
            ) : null}
            {canCancel && sub?.status !== "cancelled" ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
              >
                Cancel subscription
              </Button>
            ) : null}
          </div>

          {canRenew && renewalSectionOpen ? (
            <div className={wbStyles.renewalPanel}>
              <h3>Renew for the next period</h3>
              <p className={styles.metaLine}>
                You&apos;re within five days of your current period end. Pay the same account, then submit your
                reference so we can extend your access without a gap.
              </p>
              {bankDetailsBlock}
              {payReferenceForm}
            </div>
          ) : null}
        </Card>
      ) : null}

      {showBankTransferCard ? (
        <Card className={`${wbStyles.bankCard} ${showSubscriptionManagement ? wbStyles.mtCard : ""}`}>
          <h2>Bank transfer (NGN)</h2>
          <p className={styles.metaLine}>
            Send your plan payment to the account below, then submit the reference you used (or a short note) to match
            your transfer.
          </p>
          {bankDetailsBlock}
          {sub ? (
            <p className={styles.metaLine}>
              <strong>Plan:</strong> {sub.planName} · <strong>Amount:</strong> {amountLabel}
              {sub.isMonthly ? " · Renews monthly after each approval" : " · One-time term after approval"}
            </p>
          ) : null}
          {sub?.periodEnd ? (
            <p className={styles.metaLine}>
              Current period ends (last day with access): <strong>{sub.periodEnd}</strong>
            </p>
          ) : null}
          {error && !showSubscriptionManagement ? (
            <p style={{ color: "var(--color-danger, #b91c1c)" }}>{error}</p>
          ) : null}
          {showAwaiting ? (
            <p className={styles.metaLine}>
              <strong>Status:</strong> Awaiting confirmation. You will get access as soon as your payment is approved.
            </p>
          ) : null}
          {showPayForm ? <div style={{ marginTop: 16 }}>{payReferenceForm}</div> : null}
          {canCancel && sub?.status !== "cancelled" && !showSubscriptionManagement ? (
            <div style={{ marginTop: 24 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={cancelling}
              >
                Cancel subscription
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
