// Seed the default venue (Saga X Space) and three packages.
// Idempotent: re-running won't duplicate rows.

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

  // Use service_role-bypass: insert directly as postgres superuser
  // (we're not relying on RLS here since this is bootstrap)

  // 1) Default venue
  const venueRes = await c.query(`
    insert into public.venues
      (slug, name, short_description, description, address, city, state, capacity, amenities, active, display_order)
    values
      ('saga-x-space', 'Saga X Space', 'A bright hall in Senawang for celebrations, trainings and gatherings.',
       'Saga X Space is a clean, easy-to-book hall in Senawang, Negeri Sembilan. Bright lighting, hard shadows, sticker decor — playful, but practical. Suitable for birthdays, akad nikah, training sessions, and small corporate events. Up to 80 pax theatre-style.',
       'Taman Saga, Senawang', 'Senawang', 'Negeri Sembilan', 80,
       '["Air-cond","Projector","Sound system","Tables & chairs","Free parking","Wheelchair access"]'::jsonb,
       true, 1)
    on conflict (slug) do update set
      name = excluded.name,
      short_description = excluded.short_description,
      description = excluded.description,
      address = excluded.address,
      city = excluded.city,
      state = excluded.state,
      capacity = excluded.capacity,
      amenities = excluded.amenities,
      active = excluded.active,
      display_order = excluded.display_order
    returning id, slug
  `);
  const venueId = venueRes.rows[0]?.id;
  console.log("Venue:", venueRes.rows[0]?.slug, "id=", venueId);

  // 2) Three packages
  const packages = [
    { key: "hour", title: "1 Hour", duration: 60, amount: 10000, desc: "Quick slot for a small event or photo session." },
    { key: "four", title: "4 Hours", duration: 240, amount: 18000, desc: "Half-day rental — perfect for a birthday party or training." },
    { key: "full", title: "Full Day", duration: 600, amount: 30000, desc: "10-hour rental for weddings, akad nikah, and big events." },
  ];
  for (let i = 0; i < packages.length; i++) {
    const p = packages[i];
    await c.query(
      `insert into public.packages
         (venue_id, key, title, description, duration_minutes, amount_cents, human_price, active, display_order)
       values ($1,$2,$3,$4,$5,$6,$7,true,$8)
       on conflict (venue_id, key) do update set
         title = excluded.title,
         description = excluded.description,
         duration_minutes = excluded.duration_minutes,
         amount_cents = excluded.amount_cents,
         human_price = excluded.human_price,
         active = excluded.active,
         display_order = excluded.display_order`,
      [venueId, p.key, p.title, p.desc, p.duration, p.amount, `RM${(p.amount / 100).toFixed(0)}`, i + 1]
    );
    console.log(`  package: ${p.key} = ${p.title} (RM${(p.amount / 100).toFixed(0)})`);
  }

  // 3) Settings — make sure default row has actual values
  await c.query(`
    update public.settings set
      company_name = coalesce(company_name, 'Saga X Space'),
      whatsapp = coalesce(whatsapp, '+60123456789'),
      email = coalesce(email, 'hello@sagaxventures.com'),
      bank_name = coalesce(bank_name, 'Maybank'),
      bank_account_number = coalesce(bank_account_number, ''),
      bank_account_name = coalesce(bank_account_name, 'Saga X Space'),
      resend_from = coalesce(resend_from, 'Saga X Space <bookings@sagaxventures.com>'),
      signature_lines = coalesce(signature_lines, '["Saga X Space","SAGA X Ventures"]'::jsonb)
    where id = 1
  `);
  console.log("Settings updated.");

  // 4) Verify
  const v = await c.query("select count(*)::int as n from public.venues where active = true");
  const p = await c.query("select count(*)::int as n from public.packages where active = true");
  console.log(`\nFinal: ${v.rows[0].n} active venue(s), ${p.rows[0].n} active package(s).`);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
