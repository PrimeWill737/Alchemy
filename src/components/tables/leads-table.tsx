"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SimpleTable } from "@/components/ui/simple-table";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminDisplayCurrency } from "@/hooks/use-admin-display-currency";
import { canDeleteLead, canUpdateLeadStatus, leadStatusLabel } from "@/lib/rbac";
import { formatCurrency } from "@/utils/format-currency";
import type { LeadStatus } from "@/types/crm";

const LEAD_STATUSES: LeadStatus[] = ["new", "qualified", "proposal", "won", "lost"];

function statusTone(status: LeadStatus): "success" | "warning" | "default" {
  if (status === "won") return "success";
  if (status === "lost") return "warning";
  return "default";
}

export function LeadsTable() {
  const currentUser = useCurrentUser();
  const leads = useCrmStore((state) => state.leads);
  const users = useCrmStore((state) => state.users);
  const updateLeadStatus = useCrmStore((state) => state.updateLeadStatus);
  const removeLead = useCrmStore((state) => state.removeLead);
  const { currency } = useAdminDisplayCurrency();

  const profile = useMemo(
    () => users.find((user) => user.id === currentUser.id),
    [users, currentUser.id],
  );

  const canEditStatus = canUpdateLeadStatus(currentUser.role, profile?.permissionLevel);
  const canDelete = canDeleteLead(currentUser.role, profile?.permissionLevel);
  const showActions = canEditStatus || canDelete;

  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const deleteLeadName = useMemo(
    () => leads.find((l) => l.id === deleteLeadId)?.name ?? "",
    [leads, deleteLeadId],
  );

  const patchStatus = (leadId: string, status: LeadStatus) => {
    updateLeadStatus(leadId, status);
    void fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
  };

  const confirmDeleteLead = async () => {
    if (!deleteLeadId || !canDelete) return;
    setDeletePending(true);
    try {
      try {
        const res = await fetch(`/api/leads/${encodeURIComponent(deleteLeadId)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok && res.status !== 404) {
          return;
        }
      } catch {
        /* still remove locally when API is mock or offline */
      }
      removeLead(deleteLeadId);
      setDeleteLeadId(null);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={deleteLeadId !== null}
        title="Delete lead?"
        description={
          <>
            Remove <strong>{deleteLeadName || "this lead"}</strong> from the pipeline? This cannot be undone from the
            table.
          </>
        }
        confirmLabel="Delete"
        confirmPendingLabel="Deleting…"
        pending={deletePending}
        onCancel={() => !deletePending && setDeleteLeadId(null)}
        onConfirm={confirmDeleteLead}
      />
      <SimpleTable
        headers={["Lead", "Source", "Status", "Value", ...(showActions ? ["Actions"] : [])]}
        rows={leads.map((lead) => {
          const row: ReactNode[] = [
            lead.name,
            lead.source,
            canEditStatus ? (
              <select
                key={`${lead.id}-status`}
                value={lead.status}
                aria-label={`Status for ${lead.name}`}
                onChange={(event) => patchStatus(lead.id, event.target.value as LeadStatus)}
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {leadStatusLabel(status)}
                  </option>
                ))}
              </select>
            ) : (
              <Badge
                key={`${lead.id}-status`}
                text={leadStatusLabel(lead.status)}
                tone={statusTone(lead.status)}
              />
            ),
            formatCurrency(lead.value, currency),
          ];

          if (showActions) {
            row.push(
              <div key={`${lead.id}-actions`} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {canDelete ? (
                  <Button type="button" variant="secondary" onClick={() => setDeleteLeadId(lead.id)}>
                    Delete
                  </Button>
                ) : (
                  <span>—</span>
                )}
              </div>,
            );
          }

          return row;
        })}
      />
    </>
  );
}
