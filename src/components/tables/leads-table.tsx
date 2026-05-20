"use client";

import { Badge } from "@/components/ui/badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { useCrmStore } from "@/store/use-crm-store";
import { useAdminDisplayCurrency } from "@/hooks/use-admin-display-currency";
import { formatCurrency } from "@/utils/format-currency";

export function LeadsTable() {
  const leads = useCrmStore((state) => state.leads);
  const { currency } = useAdminDisplayCurrency();

  return (
    <SimpleTable
      headers={["Lead", "Source", "Status", "Value"]}
      rows={leads.map((lead) => [
        lead.name,
        lead.source,
        <Badge key={`${lead.id}-status`} text={lead.status} tone={lead.status === "won" ? "success" : "default"} />,
        formatCurrency(lead.value, currency),
      ])}
    />
  );
}
