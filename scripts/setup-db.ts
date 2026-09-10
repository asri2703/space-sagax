// One-off script: connect to Supabase Postgres directly and run the
// schema.sql from scripts/schema.sql. Uses connection details
// constructed from SUPABASE_URL read from .env.local.
//
// Usage:  npx tsx scripts/setup-db.ts
//
// Note: this requires the Supabase database password, not the API
// service role key. If you don't have the DB password, run
// scripts/schema.sql manually in the Supabase SQL Editor instead:
//   https://supabase.com/dashboard/project/kfjsdlqkebrepwjciedr/sql/new

import { readFileSync } from "node:fs";
import { Client } from "pg";

// Load .env.local manually (TS scripts don't auto-load)
const env: Record<string, string> = {};
const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const SUPABASE_URL = env.SUPABASE_URL || "";
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD || "";

if (!SUPABASE_URL) {
  console.error("SUPABASE_URL is not set in .env.local");
  process.exit(1);
}

const refMatch = SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error("Could not parse project ref from SUPABASE_URL");
  process.exit(1);
}
const ref = refMatch[1];

if (!DB_PASSWORD) {
  console.error(
    "SUPABASE_DB_PASSWORD is not set in .env.local.\n" +
      "Get it from: Supabase Dashboard → Project Settings → Database → Connection string\n" +
      "Or run scripts/schema.sql manually in the SQL Editor."
  );
  process.exit(1);
}

const client = new Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const sql = readFileSync(schemaPath, "utf8");

  console.log(`Connecting to db.${ref}.supabase.co:5432 ...`);
  await client.connect();
  console.log("Connected.");

  console.log(`Running schema (${sql.length} bytes) ...`);
  await client.query(sql);
  console.log("Schema applied.");

  // Verify
  const tables = await client.query(
    "select tablename from pg_tables where schemaname='public' and tablename in ('venues','packages','bookings','settings') order by tablename"
  );
  console.log("Tables created:", tables.rows.map((r) => r.tablename).join(", "));

  const venues = await client.query("select slug, name from venues");
  console.log("Seed venues:", venues.rows.map((r) => `${r.slug} (${r.name})`).join("; "));

  const packages = await client.query("select key, title, amount_cents, duration_minutes from packages order by display_order");
  console.log("Seed packages:");
  for (const p of packages.rows) {
    console.log(`  - ${p.key}: ${p.title} | RM${(p.amount_cents / 100).toFixed(2)} | ${p.duration_minutes}min`);
  }

  await client.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
