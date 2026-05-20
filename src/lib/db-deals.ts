import type { Deal, DealStage } from "@/types/crm";
import { query } from "@/lib/db";

type DealRow = {
  id: string;
  title: string;
  customer_id: string | null;
  value: string;
  stage: string;
  close_date: Date | string | null;
  assigned_to: string | null;
};

function formatCloseDate(closeDate: Date | string | null): string {
  if (!closeDate) return "";
  if (closeDate instanceof Date) return closeDate.toISOString().slice(0, 10);
  return String(closeDate).slice(0, 10);
}

function rowToDeal(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    customerId: row.customer_id ?? "",
    value: Number(row.value),
    stage: row.stage as DealStage,
    closeDate: formatCloseDate(row.close_date),
    assignedTo: row.assigned_to ?? "",
  };
}

export async function listDeals(organizationId: string): Promise<Deal[]> {
  const { rows } = await query<DealRow>(
    `SELECT id, title, customer_id, value::text, stage::text, close_date, assigned_to
     FROM deals
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [organizationId],
  );
  return rows.map(rowToDeal);
}

export type CreateDealInput = {
  organizationId: string;
  title: string;
  customerId?: string;
  value: number;
  stage?: DealStage;
  closeDate?: string;
  assignedTo?: string;
  createdBy?: string;
};

export async function createDeal(input: CreateDealInput): Promise<Deal> {
  const { rows } = await query<DealRow>(
    `INSERT INTO deals (
       organization_id, title, customer_id, value, stage, close_date, assigned_to, created_by
     )
     VALUES (
       $1, $2, $3, $4,
       COALESCE($5::deal_stage, 'discovery'::deal_stage),
       $6::date, $7, $8
     )
     RETURNING id, title, customer_id, value::text, stage::text, close_date, assigned_to`,
    [
      input.organizationId,
      input.title,
      input.customerId ?? null,
      input.value,
      input.stage ?? "discovery",
      input.closeDate || null,
      input.assignedTo ?? null,
      input.createdBy ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create deal");
  return rowToDeal(row);
}
