"use client";

import { PricingWireGrid, Skeleton, WireCard } from "@/components/ui/skeleton";
import styles from "./module-page-wireframe.module.scss";

/** Dashboard-style shimmer blocks until client session is ready. */
export function DashboardWireframe() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className={styles.heroBar} variant="rect" height={72} />
      <div className={styles.statRow}>
        <WireCard />
        <WireCard />
        <WireCard />
      </div>
      <Skeleton className={styles.wide} variant="rect" height={200} />
    </div>
  );
}

/** Generic CRM page shell — hero line + card grid + panel. */
export function ModulePageWireframe() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading">
      <Skeleton variant="line" height={28} style={{ width: "min(280px, 55%)" }} />
      <Skeleton variant="line" height={14} style={{ width: "min(420px, 88%)" }} />
      <PricingWireGrid count={2} />
    </div>
  );
}
