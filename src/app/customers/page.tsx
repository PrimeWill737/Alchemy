"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { CustomersTable } from "@/components/tables/customers-table";
import { CustomerForm } from "@/components/forms/customer-form";
import styles from "@/app/module-pages.module.scss";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canAddCustomer } from "@/lib/rbac";

export default function CustomersPage() {
  const currentUser = useCurrentUser();
  const showAddCustomer = canAddCustomer(currentUser.role);

  return (
    <AppShell heading="Customers" subheading="Profiles, history, and segmentation">
      <section className={styles.splitGrid}>
        <Card>
          <h2>Customer Directory</h2>
          <CustomersTable />
        </Card>
        <Card>
          <h2>Add Customer</h2>
          {showAddCustomer ? (
            <CustomerForm />
          ) : (
            <p>You do not have access to customer records.</p>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
