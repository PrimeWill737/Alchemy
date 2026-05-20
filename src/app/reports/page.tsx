"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ReportsExportPanel } from "@/components/reports/reports-export-panel";
import { useCurrentUser } from "@/hooks/use-current-user";
import styles from "./reports.module.scss";
import { ModulePageWireframe } from "@/components/loading/module-page-wireframe";

type ReportsPayload = {
  monthlyRevenue: { month: string; revenue: number }[];
};

export default function ReportsPage() {
  const currentUser = useCurrentUser();
  const [chartData, setChartData] = useState<ReportsPayload["monthlyRevenue"]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser.ready) return;
    let cancelled = false;
    fetch("/api/reports", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ReportsPayload | null) => {
        if (cancelled || !data?.monthlyRevenue) return;
        setChartData(data.monthlyRevenue);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser.ready]);

  if (!currentUser.ready || loading) {
    return (
      <AppShell heading="Reports" subheading="Loading metrics…">
        <ModulePageWireframe />
      </AppShell>
    );
  }

  return (
    <AppShell heading="Reports" subheading="Lead, revenue, and team performance metrics">
      <section className={styles.layout}>
        <Card>
          <h2>Revenue Trend</h2>
          <RevenueChart data={chartData} />
        </Card>
        <Card className={styles.exportsCard}>
          <h2>Exports</h2>
          <ReportsExportPanel />
        </Card>
      </section>
    </AppShell>
  );
}
