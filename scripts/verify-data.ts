// Final verification: simulate the app's API queries to confirm
// everything works end-to-end.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env: Record<string, string> = {};
const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

async function check(name: string, fn: () => Promise<{ ok: boolean; detail?: string }>) {
  try {
    const r = await fn();
    checks.push({ name, ...r });
  } catch (e) {
    checks.push({ name, ok: false, detail: (e as Error).message });
  }
}

await check("venues (public list)", async () => {
  const { data, error } = await supa.from("venues").select("id, slug, name, capacity").eq("active", true).order("display_order");
  if (error) return { ok: false, detail: error.message };
  return { ok: (data?.length || 0) > 0, detail: `${data?.length} venue(s): ${data?.map((v) => v.slug).join(", ")}` };
});

await check("packages for saga-x-space", async () => {
  const { data, error } = await supa.from("packages").select("key, title, amount_cents, duration_minutes").eq("active", true).order("display_order");
  if (error) return { ok: false, detail: error.message };
  return { ok: (data?.length || 0) >= 3, detail: `${data?.length} package(s): ${data?.map((p) => `${p.key}=RM${p.amount_cents / 100}`).join(", ")}` };
});

await check("bookings list", async () => {
  const { data, error } = await supa.from("bookings").select("reference, name, event_date, status").order("event_date");
  if (error) return { ok: false, detail: error.message };
  return { ok: (data?.length || 0) > 0, detail: `${data?.length} booking(s): ${data?.map((b) => b.reference).join(", ")}` };
});

await check("settings row", async () => {
  const { data, error } = await supa.from("settings").select("id, company_name, whatsapp, email, bank_name").eq("id", 1).single();
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: `${data.company_name} | ${data.whatsapp} | ${data.bank_name}` };
});

await check("availability helper (saga-x-space, current month)", async () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: venue } = await supa.from("venues").select("id").eq("slug", "saga-x-space").single();
  if (!venue) return { ok: false, detail: "venue not found" };
  const { data, error } = await supa
    .from("bookings")
    .select("event_date, status")
    .eq("venue_id", venue.id)
    .gte("event_date", `${month}-01`)
    .lte("event_date", `${month}-28`)
    .in("status", ["confirmed", "pending_payment", "pending_review"]);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: `${data?.length || 0} active booking(s) in ${month}` };
});

console.log("\n=== End-to-end verification ===\n");
for (const c of checks) {
  const mark = c.ok ? "✅" : "❌";
  console.log(`${mark} ${c.name}`);
  if (c.detail) console.log(`   ${c.detail}`);
}
const allOk = checks.every((c) => c.ok);
console.log(`\n${allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
process.exit(allOk ? 0 : 1);
