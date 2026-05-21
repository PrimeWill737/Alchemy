"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useWorkspaceDataReady } from "@/hooks/use-crm-data-sync";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminDisplayCurrency } from "@/hooks/use-admin-display-currency";
import { formatCurrency } from "@/utils/format-currency";
import type { DealStage } from "@/types/crm";
import styles from "./pipeline.module.scss";
import { ModulePageWireframe } from "@/components/loading/module-page-wireframe";

const columns: { key: DealStage; title: string }[] = [
  { key: "discovery", title: "Discovery" },
  { key: "proposal", title: "Proposal" },
  { key: "negotiation", title: "Negotiation" },
  { key: "closed_won", title: "Closed Won" },
  { key: "closed_lost", title: "Closed Lost" },
];

export default function PipelinePage() {
  const currentUser = useCurrentUser();
  const workspaceReady = useWorkspaceDataReady();
  const deals = useCrmStore((state) => state.deals);
  const { currency } = useAdminDisplayCurrency();

  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, typeof deals>();
    for (const col of columns) {
      map.set(col.key, deals.filter((deal) => deal.stage === col.key));
    }
    return map;
  }, [deals]);

  if (!workspaceReady) {
    return (
      <AppShell heading="Pipeline" subheading="Loading deals…">
        <ModulePageWireframe />
      </AppShell>
    );
  }

  return (
    <AppShell heading="Pipeline" subheading="Deal stages in a grid — discovery through close">
      <section className={styles.board}>
        {columns.map((column) => {
          const stageDeals = dealsByStage.get(column.key) ?? [];
          return (
            <Card key={column.key} className={styles.column}>
              <div className={styles.columnHeader}>
                <h3>{column.title}</h3>
                <span className={styles.count}>{stageDeals.length}</span>
              </div>
              <div className={styles.deals}>
                {stageDeals.length === 0 ? (
                  <p className={styles.emptyStage}>No deals in this stage</p>
                ) : (
                  stageDeals.map((deal) => (
                    <div key={deal.id} className={styles.dealCard}>
                      <strong className={styles.dealTitle}>{deal.title}</strong>
                      <p className={styles.dealValue}>{formatCurrency(deal.value, currency)}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </section>
    </AppShell>
  );
}
