import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function buildPoolConfig(connectionString: string) {
  const isProduction = process.env.NODE_ENV === "production";
  const useSsl =
    isProduction ||
    connectionString.includes("supabase.com") ||
    process.env.DATABASE_SSL === "true";

  return {
    connectionString,
    max: isProduction ? 3 : 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function getDb(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool(buildPoolConfig(url));
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db.query<T>(text, params);
}
