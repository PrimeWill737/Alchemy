import { getDb, query } from "@/lib/db";
import type { LeadSource } from "@/types/crm";

export async function listLeadSources(organizationId: string): Promise<LeadSource[]> {
  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id::text AS id, name
     FROM lead_sources
     WHERE organization_id = $1
     ORDER BY sort_order ASC, name ASC`,
    [organizationId],
  );
  return rows;
}

export async function createLeadSource(organizationId: string, name: string): Promise<LeadSource> {
  const trimmed = name.trim();
  const { rows } = await query<{ id: string; name: string }>(
    `INSERT INTO lead_sources (organization_id, name, sort_order)
     VALUES (
       $1,
       $2,
       COALESCE((SELECT MAX(sort_order) + 1 FROM lead_sources ls WHERE ls.organization_id = $1), 0)
     )
     RETURNING id::text AS id, name`,
    [organizationId, trimmed],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create lead source");
  return row;
}

export async function updateLeadSourceName(
  organizationId: string,
  sourceId: string,
  newName: string,
): Promise<{ id: string; name: string; previousName: string } | null> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const trimmed = newName.trim();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const prev = await client.query<{ name: string }>(
      `SELECT name FROM lead_sources WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
      [sourceId, organizationId],
    );
    const previousName = prev.rows[0]?.name;
    if (!previousName) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(
      `UPDATE lead_sources SET name = $3, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
      [sourceId, organizationId, trimmed],
    );
    await client.query(
      `UPDATE leads
       SET source = $1, updated_at = NOW()
       WHERE organization_id = $2 AND source = $3 AND deleted_at IS NULL`,
      [trimmed, organizationId, previousName],
    );
    await client.query("COMMIT");
    return { id: sourceId, name: trimmed, previousName };
  } catch (e) {
    await client.query("ROLLBACK");
    if (e && typeof e === "object" && "code" in e) throw e;
    throw new Error("Failed to update lead source");
  } finally {
    client.release();
  }
}

export async function deleteLeadSource(organizationId: string, sourceId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM lead_sources WHERE id = $1 AND organization_id = $2`,
    [sourceId, organizationId],
  );
  return (result.rowCount ?? 0) > 0;
}
