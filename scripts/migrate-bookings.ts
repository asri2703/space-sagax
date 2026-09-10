// Read old booking data from crm_data (saga-x-space-bookings row)
// and migrate to the new bookings table.

import { readFileSync } from "node:fs";
import { Client } from "pg";

const env: Record<string, string> = {};
const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const ref = env.SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("Bad SUPABASE_URL");
  process.exit(1);
}

const c = new Client({
  host: "db." + ref + ".supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: env.SUPABASE_DB_PASSWORD || "",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  await c.connect();

  // Find the crm_data row with old bookings
  const old = await c.query(`
    select id, data from public.crm_data
    where id = 'saga-x-space-bookings'
    limit 1
  `);
  if (old.rowCount === 0) {
    console.log("No old saga-x-space-bookings row found in crm_data. Nothing to migrate.");
    await c.end();
    return;
  }
  const data = old.rows[0].data;
  const bookings = Array.isArray(data) ? data : data?.bookings || [];
  console.log(`Found ${bookings.length} old booking(s) in crm_data.`);

  if (bookings.length === 0) {
    await c.end();
    return;
  }

  // Get the venue id
  const v = await c.query("select id from public.venues where slug = 'saga-x-space' limit 1");
  const venueId = v.rows[0]?.id;
  if (!venueId) {
    console.error("No saga-x-space venue found. Run seed-data.ts first.");
    process.exit(1);
  }

  // Get a default package (4 hours) for the migration
  const pk = await c.query("select id from public.packages where key = 'four' and venue_id = $1 limit 1", [venueId]);
  const packageId = pk.rows[0]?.id;
  if (!packageId) {
    console.error("No 'four' package found. Run seed-data.ts first.");
    process.exit(1);
  }

  // Insert each booking
  let migrated = 0;
  for (const b of bookings) {
    if (!b.reference) {
      console.log(`  skipping booking with no reference:`, JSON.stringify(b).slice(0, 100));
      continue;
    }
    const eventDate = b.event_date || b.eventDate || b.date;
    if (!eventDate) {
      console.log(`  skipping ${b.reference}: no event_date`);
      continue;
    }
    const startTime = (b.start_time || b.startTime || "10:00").slice(0, 5);
    const endTime = (b.end_time || b.endTime || "14:00").slice(0, 5);
    const amountCents = Number(b.amount_cents || b.amountCents || b.amount || 18000);
    const baseAmountCents = Number(b.base_amount_cents || b.baseAmountCents || amountCents);
    const humanPrice = b.human_price || b.humanPrice || `RM${(amountCents / 100).toFixed(0)}`;

    await c.query(
      `insert into public.bookings
         (reference, venue_id, package_id, name, email, whatsapp,
          event_date, start_time, end_time, amount_cents, base_amount_cents, human_price,
          status, payment_method, admin_note, payment_reference, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       on conflict (reference) do update set
         status = excluded.status,
         admin_note = excluded.admin_note,
         amount_cents = excluded.amount_cents,
         human_price = excluded.human_price`,
      [
        b.reference,
        venueId,
        packageId,
        b.name || "Migrated booking",
        b.email || null,
        b.whatsapp || null,
        eventDate,
        startTime,
        endTime,
        amountCents,
        baseAmountCents,
        humanPrice,
        b.status || "confirmed",
        b.payment_method || b.paymentMethod || "manual",
        b.admin_note || b.adminNote || null,
        b.payment_reference || b.paymentReference || null,
        b.created_at || b.createdAt || new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    console.log(`  migrated: ${b.reference} (${b.name} on ${eventDate}, ${b.status || "confirmed"})`);
    migrated++;
  }

  console.log(`\nMigration complete: ${migrated} booking(s) imported.`);

  // Verify
  const all = await c.query("select reference, name, event_date, status from public.bookings order by event_date");
  console.log(`\nAll bookings in new table (${all.rowCount}):`);
  for (const row of all.rows) {
    console.log(`  ${row.reference} | ${row.name} | ${row.event_date} | ${row.status}`);
  }

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
