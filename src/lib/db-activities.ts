import type { Activity, ActivityExportPurpose } from "@/types/crm";
import { query } from "@/lib/db";

type ActivityRow = {
  id: string;
  type: string;
  description: string;
  user_id: string | null;
  created_at: Date | string;
  supervising_admin_id: string | null;
  export_purpose: string | null;
};

function rowToActivity(row: ActivityRow): Activity {
  const created =
    row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10);
  return {
    id: row.id,
    type: row.type as Activity["type"],
    description: row.description,
    userId: row.user_id ?? "",
    createdAt: created,
    supervisingAdminId: row.supervising_admin_id ?? undefined,
    exportPurpose: (row.export_purpose as ActivityExportPurpose) ?? undefined,
  };
}

export async function listActivities(organizationId: string): Promise<Activity[]> {
  const { rows } = await query<ActivityRow>(
    `SELECT a.id, a.type, a.description, a.user_id, a.created_at,
            u.supervising_admin_id,
            NULL::text AS export_purpose
     FROM activities a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.organization_id = $1
     ORDER BY a.created_at DESC
     LIMIT 100`,
    [organizationId],
  );
  return rows.map(rowToActivity);
}

export type CreateActivityInput = {
  organizationId: string;
  type: Activity["type"];
  description: string;
  userId?: string;
  exportPurpose?: ActivityExportPurpose;
};

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const { rows } = await query<ActivityRow>(
    `WITH ins AS (
       INSERT INTO activities (organization_id, type, description, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, description, user_id, created_at
     )
     SELECT ins.id, ins.type, ins.description, ins.user_id, ins.created_at,
            u.supervising_admin_id,
            NULL::text AS export_purpose
     FROM ins
     LEFT JOIN users u ON u.id = ins.user_id`,
    [input.organizationId, input.type, input.description, input.userId ?? null],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to create activity");
  return rowToActivity(row);
}
