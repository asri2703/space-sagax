// Supabase client (server-side only).
//
// We use the service_role key for all admin operations and for
// public reads (the RLS policies in schema.sql allow either
// service_role or `active = true` for venues/packages).
//
// Never expose this client to the browser.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel project settings and in local .env.local."
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "public" },
  });
  return cached;
}

export type Venue = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  hero_image: string | null;
  gallery_images: string[];
  capacity: number | null;
  amenities: string[];
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type Package = {
  id: string;
  venue_id: string;
  key: "hour" | "four" | "full";
  title: string;
  duration_minutes: number;
  amount_cents: number;
  human_price: string;
  description: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type BookingStatus = "pending_payment" | "pending_review" | "confirmed" | "cancelled";

export type Booking = {
  reference: string;
  venue_id: string;
  package_id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string | null;
  status: BookingStatus;
  amount_cents: number;
  base_amount_cents: number;
  human_price: string;
  price_label: string | null;
  admin_note: string | null;
  payment_method: "billplz" | "manual" | "bank_transfer";
  billplz_bill_id: string | null;
  billplz_bill_url: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: 1;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  whatsapp: string;
  email: string;
  company_name: string;
  signature_lines: string[];
  resend_from: string | null;
  updated_at: string;
};

// ── public read shapes (computed from bookings) ────────────────────────

export type DayStatus = "available" | "fully_booked" | "partially_booked";

export type DayAvailability = {
  date: string; // YYYY-MM-DD
  status: DayStatus;
};

export type MonthAvailability = {
  month: string; // YYYY-MM
  days: DayAvailability[];
};
