"use client";

import { BillingGateProvider } from "@/context/billing-gate-context";
import { useCrmDataSync } from "@/hooks/use-crm-data-sync";
import { ScrollDownIndicator } from "@/components/ui/scroll-down-indicator";

function CrmDataSync() {
  useCrmDataSync();
  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <BillingGateProvider>
      <CrmDataSync />
      <ScrollDownIndicator />
      {children}
    </BillingGateProvider>
  );
}
