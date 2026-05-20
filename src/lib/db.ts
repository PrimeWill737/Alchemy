import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function getDb(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db.query<T>(text, params);
}
