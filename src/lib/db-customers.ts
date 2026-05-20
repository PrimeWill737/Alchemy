import type { Customer } from "@/types/crm";
import { query } from "@/lib/db";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  assigned_to: string | null;
  created_by: string | null;
  created_at: Date | string;
};

function rowToCustomer(row: CustomerRow, supervisingAdminId?: string): Customer {
  const created =
    row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10);
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    company: row.company ?? "",
    status: row.status === "inactive" ? "inactive" : "active",
    assignedTo: row.assigned_to ?? "",
    createdAt: created,
    createdByUserId: row.created_by ?? undefined,
    supervisingAdminId,
  };
}

export async function listCustomers(organizationId: string): Promise<Customer[]> {
  const { rows } = await query<
    CustomerRow & { supervising_admin_id: string | null }
  >(
    `SELECT c.id, c.name, c.email, c.phone, c.company, c.status, c.assigned_to, c.created_by, c.created_at,
            u.supervising_admin_id
     FROM customers c
     LEFT JOIN users u ON u.id = c.assigned_to
     WHERE c.organization_id = $1 AND c.deleted_at IS NULL
     ORDER BY c.created_at DESC`,
    [organizationId],
  );
  return rows.map((row) =>
    rowToCustomer(row, row.supervising_admin_id ?? undefined),
  );
}

export type CreateCustomerInput = {
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  assignedTo: string;
  createdBy?: string;
};

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { rows } = await query<CustomerRow & { supervising_admin_id: string | null }>(
    `WITH ins AS (
       INSERT INTO customers (
         organization_id, name, email, phone, company, status, assigned_to, created_by
       )
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
       RETURNING id, name, email, phone, company, status, assigned_to, created_by, created_at
     )
     SELECT ins.*, u.supervising_admin_id
     FROM ins
     LEFT JOIN users u ON u.id = ins.assigned_to`,
    [
      input.organizationId,
      input.name,
      input.email,
      input.phone,
      input.company,
      input.assignedTo,
      input.createdBy ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create customer");
  return rowToCustomer(row, row.supervising_admin_id ?? undefined);
}

export async function softDeleteCustomer(organizationId: string, customerId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE customers
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL`,
    [customerId, organizationId],
  );
  return (rowCount ?? 0) > 0;
}
