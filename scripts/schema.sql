-- Saga X Space — production schema.
--
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/kfjsdlqkebrepwjciedr/sql/new
--
-- Idempotent: safe to re-run.

-- ── venues ──────────────────────────────────────────────
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  short_description text,
  address text,
  city text,
  state text,
  hero_image text,
  gallery_images jsonb not null default '[]'::jsonb,
  capacity int,
  amenities jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venues_active_order_idx on public.venues (active, display_order);
alter table public.venues enable row level security;
drop policy if exists venues_public_read on public.venues;
create policy venues_public_read on public.venues
  for select using (active = true);
drop policy if exists venues_service_all on public.venues;
create policy venues_service_all on public.venues
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── packages ────────────────────────────────────────────
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  key text not null check (key in ('hour', 'four', 'full')),
  title text not null,
  duration_minutes int not null check (duration_minutes > 0),
  amount_cents int not null check (amount_cents >= 0),
  human_price text not null,
  description text,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, key)
);
create index if not exists packages_venue_idx on public.packages (venue_id, active, display_order);
alter table public.packages enable row level security;
drop policy if exists packages_public_read on public.packages;
create policy packages_public_read on public.packages
  for select using (active = true);
drop policy if exists packages_service_all on public.packages;
create policy packages_service_all on public.packages
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── bookings ───────────────────────────────────────────
create table if not exists public.bookings (
  reference text primary key,
  venue_id uuid not null references public.venues(id) on delete restrict,
  package_id uuid not null references public.packages(id) on delete restrict,
  name text not null,
  email text,
  whatsapp text,
  event_date date not null,
  start_time time not null,
  end_time time,
  status text not null default 'pending_review'
    check (status in ('pending_payment', 'pending_review', 'confirmed', 'cancelled')),
  amount_cents int not null check (amount_cents >= 0),
  base_amount_cents int not null check (base_amount_cents >= 0),
  human_price text not null,
  price_label text,
  admin_note text,
  payment_method text not null default 'manual'
    check (payment_method in ('billplz', 'manual', 'bank_transfer')),
  billplz_bill_id text,
  billplz_bill_url text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_event_date_idx on public.bookings (event_date);
create index if not exists bookings_venue_idx on public.bookings (venue_id, event_date);
create index if not exists bookings_status_idx on public.bookings (status);
alter table public.bookings enable row level security;
-- Public can only create a booking (insert). They can read their own
-- booking by reference, but we don't expose that endpoint in MVP.
drop policy if exists bookings_public_insert on public.bookings;
create policy bookings_public_insert on public.bookings
  for insert with check (true);
drop policy if exists bookings_service_all on public.bookings;
create policy bookings_service_all on public.bookings
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── settings (singleton row) ───────────────────────────
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  whatsapp text not null default '60137732703',
  email text not null default 'sagadigitaladvertising@gmail.com',
  company_name text not null default 'Saga X Ventures',
  signature_lines jsonb not null default '["Saga X Space","Senawang, Negeri Sembilan"]'::jsonb,
  resend_from text,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select using (true);
drop policy if exists settings_service_all on public.settings;
create policy settings_service_all on public.settings
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Seed default settings row
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ── updated_at triggers ────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists venues_touch on public.venues;
create trigger venues_touch before update on public.venues
  for each row execute function public.touch_updated_at();

drop trigger if exists packages_touch on public.packages;
create trigger packages_touch before update on public.packages
  for each row execute function public.touch_updated_at();

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
