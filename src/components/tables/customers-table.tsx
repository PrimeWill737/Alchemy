"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SimpleTable } from "@/components/ui/simple-table";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canDeleteCustomer } from "@/lib/rbac";

export function CustomersTable() {
  const currentUser = useCurrentUser();
  const customers = useCrmStore((state) => state.customers);
  const users = useCrmStore((state) => state.users);
  const removeCustomer = useCrmStore((state) => state.removeCustomer);

  const profile = useMemo(
    () => users.find((user) => user.id === currentUser.id),
    [users, currentUser.id],
  );

  const canDelete = canDeleteCustomer(currentUser.role, profile?.permissionLevel);

  const visibleCustomers = useMemo(() => {
    if (currentUser.role === "super_admin") return customers;
    if (currentUser.role === "admin" && currentUser.id) {
      return customers.filter(
        (customer) =>
          customer.supervisingAdminId === currentUser.id || customer.assignedTo === currentUser.id,
      );
    }
    return customers;
  }, [customers, currentUser.id, currentUser.role]);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user.name])), [users]);

  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const deleteCustomerName = useMemo(
    () => visibleCustomers.find((c) => c.id === deleteCustomerId)?.name ?? "",
    [visibleCustomers, deleteCustomerId],
  );

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomerId || !canDelete) return;
    setDeletePending(true);
    try {
      try {
        const res = await fetch(`/api/customers/${encodeURIComponent(deleteCustomerId)}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 404) {
          return;
        }
      } catch {
        /* still remove locally when API is mock or offline */
      }
      removeCustomer(deleteCustomerId);
      setDeleteCustomerId(null);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
    <ConfirmDialog
      open={deleteCustomerId !== null}
      title="Remove customer?"
      description={
        <>
          Remove <strong>{deleteCustomerName || "this customer"}</strong> from the directory? This cannot be undone from
          the table.
        </>
      }
      confirmLabel="Remove"
      confirmPendingLabel="Removing…"
      pending={deletePending}
      onCancel={() => !deletePending && setDeleteCustomerId(null)}
      onConfirm={confirmDeleteCustomer}
    />
    <SimpleTable
      headers={["Name", "Email", "Company", "Status", "Owner", "Actions"]}
      rows={visibleCustomers.map((customer) => [
        customer.name,
        customer.email,
        customer.company,
        <Badge
          key={`${customer.id}-status`}
          text={customer.status}
          tone={customer.status === "active" ? "success" : "warning"}
        />,
        userMap.get(customer.assignedTo) ?? customer.assignedTo,
        canDelete ? (
          <Button
            key={`${customer.id}-del`}
            type="button"
            variant="secondary"
            onClick={() => setDeleteCustomerId(customer.id)}
          >
            Delete
          </Button>
        ) : (
          <span key={`${customer.id}-na`}>—</span>
        ),
      ])}
    />
    </>
  );
}
