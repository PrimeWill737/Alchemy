"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminDisplayCurrency } from "@/hooks/use-admin-display-currency";
import { formatCurrency } from "@/utils/format-currency";
import styles from "./pipeline.module.scss";
import { ModulePageWireframe } from "@/components/loading/module-page-wireframe";

const columns = [
  { key: "discovery", title: "Discovery" },
  { key: "proposal", title: "Proposal" },
  { key: "negotiation", title: "Negotiation" },
  { key: "closed_won", title: "Closed Won" },
] as const;

export default function PipelinePage() {
  const currentUser = useCurrentUser();
  const dataReady = useCrmStore((state) => state.dataReady);
  const deals = useCrmStore((state) => state.deals);
  const { currency } = useAdminDisplayCurrency();

  if (!currentUser.ready || !dataReady) {
    return (
      <AppShell heading="Pipeline" subheading="Loading deals…">
        <ModulePageWireframe />
      </AppShell>
    );
  }

  return (
    <AppShell heading="Pipeline" subheading="Kanban deal flow and forecast view">
      <section className={styles.board}>
        {columns.map((column) => (
          <Card key={column.key} className={styles.column}>
            <h3>{column.title}</h3>
            <div className={styles.deals}>
              {deals
                .filter((deal) => deal.stage === column.key)
                .map((deal) => (
                  <div key={deal.id} className={styles.dealCard}>
                    <strong className={styles.dealTitle}>{deal.title}</strong>
                    <p className={styles.dealValue}>{formatCurrency(deal.value, currency)}</p>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
