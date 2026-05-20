"use client";

import { useCallback, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { downloadLeadReportPdf, downloadSalesReportCsv } from "@/lib/report-exports";
import { useCrmStore } from "@/store/use-crm-store";
import type { Activity, ActivityExportPurpose } from "@/types/crm";
import styles from "./reports-export-panel.module.scss";

const EXPORT_ACTIVITY: Record<
  "sales_csv" | "lead_pdf",
  { description: string; exportPurpose: ActivityExportPurpose }
> = {
  sales_csv: {
    exportPurpose: "sales_pipeline",
    description:
      "Report export (CSV): Sales & deals — pipeline snapshot for revenue tracking, forecasting, and finance handoff.",
  },
  lead_pdf: {
    exportPurpose: "lead_funnel",
    description:
      "Report export (PDF): Leads — funnel status, sources, and values for marketing attribution and sales qualification.",
  },
};

export function ReportsExportPanel() {
  const { id: userId, ready } = useCurrentUser();
  const leads = useCrmStore((s) => s.leads);
  const deals = useCrmStore((s) => s.deals);
  const customers = useCrmStore((s) => s.customers);
  const users = useCrmStore((s) => s.users);
  const addActivity = useCrmStore((s) => s.addActivity);

  const [error, setError] = useState<string | null>(null);

  const recordExportActivity = useCallback(
    async (kind: "sales_csv" | "lead_pdf") => {
      if (!userId) return;
      const profile = users.find((u) => u.id === userId);
      const meta = EXPORT_ACTIVITY[kind];
      const payload = {
        type: "export" as const,
        description: meta.description,
        userId,
        supervisingAdminId: profile?.supervisingAdminId,
        exportPurpose: meta.exportPurpose,
      };
      try {
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.activity) {
          addActivity(data.activity as Activity);
          return;
        }
      } catch {
        /* fall through */
      }
      addActivity({
        id: `a-${crypto.randomUUID()}`,
        ...payload,
        createdAt: new Date().toISOString().slice(0, 10),
      });
    },
    [addActivity, userId, users],
  );

  const onSalesCsv = useCallback(async () => {
    setError(null);
    try {
      downloadSalesReportCsv({ deals, customers, users });
      await recordExportActivity("sales_csv");
    } catch {
      setError("Could not generate CSV. Try again.");
    }
  }, [customers, deals, recordExportActivity, users]);

  const onLeadPdf = useCallback(async () => {
    setError(null);
    try {
      downloadLeadReportPdf({ leads, users });
      await recordExportActivity("lead_pdf");
    } catch {
      setError("Could not generate PDF. Try again.");
    }
  }, [leads, recordExportActivity, users]);

  const disabled = !ready || !userId;

  return (
    <div>
      <div className={styles.list}>
        <button type="button" className={styles.exportBtn} disabled={disabled} onClick={onSalesCsv}>
          Sales report (CSV)
        </button>
        <button type="button" className={styles.exportBtn} disabled={disabled} onClick={onLeadPdf}>
          Lead report (PDF)
        </button>
      </div>
      {disabled ? (
        <p className={styles.hint}>Sign in to run exports and log them to the activity feed.</p>
      ) : null}
      {error ? (
        <p className={styles.hint} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
