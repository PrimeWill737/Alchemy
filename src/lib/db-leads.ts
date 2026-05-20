import type { Lead, LeadStatus } from "@/types/crm";
import { query } from "@/lib/db";

type LeadRow = {
  id: string;
  name: string;
  source: string;
  status: string;
  value: string;
  assigned_to: string | null;
  created_at: Date | string;
};

function rowToLead(row: LeadRow): Lead {
  const created =
    row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10);
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    status: row.status as LeadStatus,
    value: Number(row.value),
    assignedTo: row.assigned_to ?? "",
    createdAt: created,
  };
}

export async function listLeads(organizationId: string): Promise<Lead[]> {
  const { rows } = await query<LeadRow>(
    `SELECT id, name, source, status::text, value::text, assigned_to, created_at
     FROM leads
     WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [organizationId],
  );
  return rows.map(rowToLead);
}

export type CreateLeadInput = {
  organizationId: string;
  name: string;
  source: string;
  value: number;
  status?: LeadStatus;
  assignedTo?: string;
  createdBy?: string;
};

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const { rows } = await query<LeadRow>(
    `INSERT INTO leads (organization_id, name, source, status, value, assigned_to, created_by)
     VALUES ($1, $2, $3, COALESCE($4::lead_status, 'new'::lead_status), $5, $6, $7)
     RETURNING id, name, source, status::text, value::text, assigned_to, created_at`,
    [
      input.organizationId,
      input.name,
      input.source,
      input.status ?? "new",
      input.value,
      input.assignedTo ?? null,
      input.createdBy ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create lead");
  return rowToLead(row);
}

export async function updateLeadStatus(
  organizationId: string,
  leadId: string,
  status: LeadStatus,
): Promise<Lead | null> {
  const { rows } = await query<LeadRow>(
    `UPDATE leads
     SET status = $3::lead_status, updated_at = NOW()
     WHERE id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL
     RETURNING id, name, source, status::text, value::text, assigned_to, created_at`,
    [leadId, organizationId, status],
  );
  return rows[0] ? rowToLead(rows[0]) : null;
}

export async function softDeleteLead(organizationId: string, leadId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE leads SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL`,
    [leadId, organizationId],
  );
  return (rowCount ?? 0) > 0;
}
