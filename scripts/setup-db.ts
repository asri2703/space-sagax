// One-off script: connect to Supabase Postgres directly and run the
// schema.sql from scripts/schema.sql. Uses connection details
// constructed from SUPABASE_URL.
//
// Usage:  node --experimental-strip-types scripts/setup-db.ts
//
// Note: this requires the Supabase database password, not the API
// service role key. If you don't have the DB password, run
// scripts/schema.sql in the Supabase SQL Editor instead:
//   https://supabase.com/dashboard/project/kfjsdlqkebrepwjciedr/sql/new

import { readFileSync } from "node:fs";
import { Client } from "pg";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || "";

if (!SUPABASE_URL) {
  console.error("SUPABASE_URL is not set");
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
    "SUPABASE_DB_PASSWORD is not set.\n" +
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

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
