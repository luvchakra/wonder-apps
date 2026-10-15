#!/usr/bin/env node
/**
 * Writes the site's copy, as it stands in the database, to supabase/seed/content.json — a
 * reviewable backup in git. The database is the source of truth; this file is a copy of it.
 *
 *   npm run content:backup
 *
 * Reads with the publishable key (read-only). To restore the file into a database, see
 * supabase/migrations/0002_import_content_documents.sql.
 */
import { writeFile } from "node:fs/promises";

const url = (process.env.WONDERAPPS_SUPABASE_URL ?? "https://gsxvidvliqarhoxbyifo.supabase.co").replace(/\/$/, "");
const key = process.env.WONDERAPPS_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_Z_0nyZgj8Rs2ueIm6lby6g_6N5vZRcQ";

const res = await fetch(`${url}/rest/v1/content_documents?select=kind,slug,position,data&order=kind.asc,position.asc,slug.asc`, {
  headers: { apikey: key, Accept: "application/json" },
});
if (!res.ok) {
  console.error(`Database read failed (${res.status}): ${await res.text()}`);
  process.exit(1);
}
const docs = await res.json();
await writeFile("supabase/seed/content.json", JSON.stringify(docs, null, 2) + "\n");
console.log(`Wrote ${docs.length} documents to supabase/seed/content.json`);
