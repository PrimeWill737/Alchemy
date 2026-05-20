"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import styles from "@/app/module-pages.module.scss";
import ccStyles from "@/app/settings/control-center.module.scss";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  organizationName: string;
  billingContactEmail: string | null;
  billingContactName: string | null;
  planNameSnapshot: string;
  amountNgn: number;
  isMonthly: boolean;
  status: string;
  transferReference: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export function SubscriptionsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/subscriptions/admin", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load subscriptions");
        setRows([]);
        return;
      }
      type ApiRow = {
        id: string;
        organizationName: string;
        billingContactEmail: string | null;
        billingContactName: string | null;
        planNameSnapshot: string;
        amountNgn: number;
        isMonthly: boolean;
        status: string;
        transferReference: string | null;
        periodStart: string | null;
        periodEnd: string | null;
      };
      const list = (Array.isArray(data.subscriptions) ? data.subscriptions : []) as ApiRow[];
      setRows(
        list.map((s) => ({
          id: s.id,
          organizationName: s.organizationName,
          billingContactEmail: s.billingContactEmail,
          billingContactName: s.billingContactName,
          planNameSnapshot: s.planNameSnapshot,
          amountNgn: s.amountNgn,
          isMonthly: s.isMonthly,
          status: s.status,
          transferReference: s.transferReference,
          periodStart: s.periodStart,
          periodEnd: s.periodEnd,
        })),
      );
    } catch {
      setError("Could not load subscriptions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setApprovingId(id);
    setError("");
    try {
      const res = await fetch(`/api/subscriptions/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Approve failed");
        return;
      }
      await load();
    } catch {
      setError("Approve failed");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <Card>
      <h2>Subscriptions</h2>
      <p className={`${styles.metaLine} ${ccStyles.cardIntro}`}>
        Approve bank transfers after you verify payment. Monthly plans start counting from the approval date. Initial
        signups cannot use the app until you confirm here.
      </p>
      {loading ? (
        <div className={ccStyles.rosterScroll} aria-busy="true" aria-label="Loading subscriptions">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", padding: "0.25rem 0" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={44} />
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className={ccStyles.planError}>{error}</p> : null}
      {!loading && rows.length === 0 ? (
        <p className={styles.metaLine}>No subscription records yet.</p>
      ) : null}
      {rows.length > 0 ? (
        <div className={ccStyles.rosterScroll}>
          <table className={ccStyles.rosterTable}>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference</th>
                <th>Period</th>
                <th className={ccStyles.actionsCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.organizationName}</td>
                  <td className={ccStyles.rosterEmail}>
                    {r.billingContactName ?? "—"}
                    {r.billingContactEmail ? (
                      <>
                        <br />
                        {r.billingContactEmail}
                      </>
                    ) : null}
                  </td>
                  <td>
                    {r.planNameSnapshot}
                    {r.isMonthly ? " (monthly)" : " (one-time)"}
                  </td>
                  <td>
                    {r.amountNgn > 0 ? `₦${r.amountNgn.toLocaleString("en-NG")}` : "Custom"}
                  </td>
                  <td>{r.status.replace(/_/g, " ")}</td>
                  <td className={ccStyles.rosterEmail}>{r.transferReference ?? "—"}</td>
                  <td>
                    {r.periodStart && r.periodEnd ? (
                      <>
                        {r.periodStart} → {r.periodEnd}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={ccStyles.actionsCell}>
                    {r.status === "payment_submitted" || r.status === "renewal_submitted" ? (
                      <Button
                        type="button"
                        disabled={approvingId === r.id}
                        onClick={() => void approve(r.id)}
                      >
                        {approvingId === r.id ? "Approving…" : "Approve"}
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}
