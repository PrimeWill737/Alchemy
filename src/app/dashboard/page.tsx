"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import styles from "@/app/module-pages.module.scss";
import dashboardStyles from "./dashboard.module.scss";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminDisplayCurrency } from "@/hooks/use-admin-display-currency";
import { useWorkspaceDataReady } from "@/hooks/use-crm-data-sync";
import { useCrmStore } from "@/store/use-crm-store";
import { formatCurrency } from "@/utils/format-currency";
import { DashboardWireframe } from "@/components/loading/module-page-wireframe";
import { getMockReportsSummary } from "@/lib/crm-mock-reports";
import { isAdminLayer } from "@/lib/admin-layers";

export default function DashboardPage() {
  const currentUser = useCurrentUser();
  const { currency } = useAdminDisplayCurrency();
  const workspaceReady = useWorkspaceDataReady();
  const leads = useCrmStore((state) => state.leads);
  const deals = useCrmStore((state) => state.deals);
  const tasks = useCrmStore((state) => state.tasks);
  const activities = useCrmStore((state) => state.activities);
  const leadSources = useCrmStore((state) => state.leadSources);
  const users = useCrmStore((state) => state.users);
  const isSuperAdmin = currentUser.role === "super_admin";

  const reports = useMemo(() => getMockReportsSummary(deals, leads), [deals, leads]);

  const visibleActivities = useMemo(() => {
    if (isSuperAdmin) return activities;
    if (currentUser.role === "admin" && currentUser.id) {
      return activities.filter(
        (activity) =>
          activity.supervisingAdminId === currentUser.id || activity.userId === currentUser.id,
      );
    }
    if (currentUser.role === "marketer" && currentUser.id) {
      return activities.filter((activity) => activity.userId === currentUser.id);
    }
    return activities;
  }, [activities, currentUser.id, currentUser.role, isSuperAdmin]);

  const wonDeals = useMemo(() => deals.filter((deal) => deal.stage === "closed_won"), [deals]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const negotiationCount = useMemo(
    () => deals.filter((deal) => deal.stage === "negotiation").length,
    [deals],
  );
  const tasksDueToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter((task) => task.status === "todo" && task.dueDate === today).length;
  }, [tasks]);
  const pipelineValue = useMemo(() => deals.reduce((acc, deal) => acc + deal.value, 0), [deals]);
  const adminLayerCount = useMemo(() => users.filter((u) => isAdminLayer(u.role)).length, [users]);

  if (!workspaceReady) {
    return (
      <AppShell heading="Dashboard" subheading="Loading your workspace…">
        <DashboardWireframe />
      </AppShell>
    );
  }

  return (
    <AppShell
      heading={isSuperAdmin ? "Super Admin Command Center" : "Admin Operations Dashboard"}
      subheading={
        isSuperAdmin
          ? "Global control over roles, governance, and organization performance."
          : "Operational CRM overview for team execution and HR-aligned workflows."
      }
    >
      <section className={dashboardStyles.topBanner}>
        <h2>Welcome back, team</h2>
        <p>
          {negotiationCount > 0
            ? `${negotiationCount} deal${negotiationCount === 1 ? "" : "s"} in negotiation — pipeline value ${formatCurrency(pipelineValue, currency)}.`
            : "No deals in negotiation right now. Review discovery and proposal stages."}
        </p>
        <div className={dashboardStyles.quickStats}>
          <div className={dashboardStyles.quickStat}>
            <span>Deals in Negotiation</span>
            <strong>{negotiationCount}</strong>
          </div>
          <div className={dashboardStyles.quickStat}>
            <span>Tasks Due Today</span>
            <strong>{tasksDueToday}</strong>
          </div>
          <div className={dashboardStyles.quickStat}>
            <span>Active Lead Sources</span>
            <strong>{leadSources.length}</strong>
          </div>
        </div>
      </section>
      <section className={styles.kpiGrid}>
        <Card>
          <p className={styles.kpiLabel}>Total Leads</p>
          <p className={styles.kpiValue}>{leads.length}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>Open Tasks</p>
          <p className={styles.kpiValue}>{openTasks.length}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>Won Deals</p>
          <p className={styles.kpiValue}>{wonDeals.length}</p>
        </Card>
        <Card>
          <p className={styles.kpiLabel}>Pipeline Value</p>
          <p className={styles.kpiValue}>{formatCurrency(pipelineValue, currency)}</p>
        </Card>
      </section>
      <section className={isSuperAdmin ? dashboardStyles.commandGrid : styles.splitGrid}>
        {isSuperAdmin ? (
          <>
            <Card>
              <h2>Executive Controls</h2>
              <div className={styles.list}>
                <div className={styles.listItem}>Admin lifecycle and role ownership</div>
                <div className={styles.listItem}>Department hive architecture and leaders</div>
                <div className={styles.listItem}>Security policy, compliance, and approvals</div>
              </div>
            </Card>
            <Card>
              <h2>Org Health</h2>
              <p className={styles.kpiLabel}>Active Admin Layers</p>
              <p className={styles.kpiValue}>{adminLayerCount}</p>
            </Card>
          </>
        ) : null}
        <Card>
          <h2 className={dashboardStyles.activityTitle}>
            {currentUser.role === "admin" ? "Activity under your org" : "Activity Feed"}
          </h2>
          <div className={styles.list}>
            {visibleActivities.length === 0 ? (
              <p className={styles.metaLine}>No activity yet. Exports and team actions will appear here.</p>
            ) : null}
            {visibleActivities.map((activity) => (
              <div key={activity.id} className={styles.listItem}>
                <div className={styles.row}>
                  <strong>{activity.type.toUpperCase()}</strong>
                  <span>{activity.createdAt}</span>
                </div>
                {activity.exportPurpose ? (
                  <p className={styles.metaLine}>
                    Purpose: {activity.exportPurpose.replace(/_/g, " ")}
                  </p>
                ) : null}
                <p>{activity.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Forecast</h2>
          <p className={styles.kpiLabel}>Estimated Close This Month</p>
          <p className={styles.kpiValue}>{formatCurrency(reports.forecastThisMonth, currency)}</p>
        </Card>
      </section>
    </AppShell>
  );
}
