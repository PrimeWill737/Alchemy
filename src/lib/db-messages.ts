import type { InboxMessage, InboxMessageStatus } from "@/types/crm";
import { query } from "@/lib/db";

type MessageRow = {
  id: string;
  channel: string;
  sender: string;
  content: string;
  created_at: Date | string;
  status: string | null;
};

function rowToMessage(row: MessageRow): InboxMessage {
  const created =
    row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10);
  const status = (row.status ?? "open") as InboxMessageStatus;
  return {
    id: row.id,
    from: row.sender,
    channel: row.channel,
    content: row.content,
    createdAt: created,
    status,
  };
}

export async function listMessages(organizationId: string): Promise<InboxMessage[]> {
  const { rows } = await query<MessageRow>(
    `SELECT id, channel, sender, content, created_at,
            COALESCE(status, 'open') AS status
     FROM messages
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId],
  );
  return rows.map(rowToMessage);
}

export async function updateMessageStatus(
  organizationId: string,
  messageId: string,
  status: InboxMessageStatus,
): Promise<InboxMessage | null> {
  const { rows } = await query<MessageRow>(
    `UPDATE messages
     SET status = $3
     WHERE id = $1::uuid AND organization_id = $2::uuid
     RETURNING id, channel, sender, content, created_at, status`,
    [messageId, organizationId, status],
  );
  return rows[0] ? rowToMessage(rows[0]) : null;
}
