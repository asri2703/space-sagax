// Quick connection check (run once, not part of the regular codebase).
import { Client } from "pg";
import { readFileSync } from "node:fs";

const env: Record<string, string> = {};
const raw = readFileSync(".env.local", "utf8");
// Normalize CRLF/CR to LF, then strip optional BOM
const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
for (const line of text.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

process.stdout.write(`[debug] keys parsed: ${Object.keys(env).join(", ")}\n`);

const url = env.SUPABASE_URL || "";
const ref = url.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  process.stdout.write(`[error] Could not parse ref from URL: "${url}"\n`);
  process.exit(1);
}
process.stdout.write(`[debug] ref: ${ref}\n`);

const c = new Client({
  host: "db." + ref + ".supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: env.SUPABASE_DB_PASSWORD || "",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

try {
  process.stdout.write("[debug] connecting...\n");
  await c.connect();
  process.stdout.write("[debug] connected\n");
  const r = await c.query("select version() as v, current_database() as db, current_user as u");
  process.stdout.write(`CONNECTED OK\nDB: ${r.rows[0].db} | User: ${r.rows[0].u}\n`);
  process.stdout.write(`PG version: ${r.rows[0].v.split(" ").slice(0, 2).join(" ")}\n`);
  const tables = await c.query("select tablename from pg_tables where schemaname='public' order by tablename");
  const list = tables.rows.map((x) => x.tablename).join(", ");
  process.stdout.write(`Existing public tables: ${list || "(none)"}\n`);
  await c.end();
  process.stdout.write("[debug] done\n");
} catch (e) {
  process.stdout.write(`FAILED: ${(e as Error).message}\n`);
  process.exit(1);
}
