"use client";

import { AppShell } from "@/components/layout/app-shell";
import { LeadForm } from "@/components/forms/lead-form";
import { LeadSourcesPanel } from "@/components/leads/lead-sources-panel";
import { LeadsTable } from "@/components/tables/leads-table";
import { Card } from "@/components/ui/card";
import styles from "@/app/module-pages.module.scss";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasPermission } from "@/lib/rbac";

export default function LeadsPage() {
  const currentUser = useCurrentUser();
  const canManageLeads = hasPermission(currentUser.role, "manage:leads");

  return (
    <AppShell heading="Leads" subheading="Lead capture, assignment, and conversion flow">
      <section className={styles.splitGrid}>
        <Card>
          <h2>Create Lead</h2>
          {canManageLeads ? <LeadForm /> : <p>Your role has read-only access for leads.</p>}
        </Card>
        <Card>
          <h2>Lead Sources</h2>
          <LeadSourcesPanel />
        </Card>
      </section>
      <Card>
        <h2>Lead Pipeline Table</h2>
        <LeadsTable />
      </Card>
    </AppShell>
  );
}
