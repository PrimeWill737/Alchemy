import { query } from "@/lib/db";

function slugBase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createSignupOrganization(companyName: string): Promise<string> {
  const name = companyName.trim();
  const base = slugBase(name) || "workspace";
  for (let i = 0; i < 20; i += 1) {
    const slug = i === 0 ? base : `${base}-${i}`;
    try {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
        [name, slug],
      );
      const id = rows[0]?.id;
      if (id) return id;
    } catch {
      /* unique slug — try next suffix */
    }
  }
  throw new Error("Could not allocate organization slug");
}
