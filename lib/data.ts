// Data access layer. All Supabase queries go through here so the
// API routes stay thin and the SQL is testable.

import { getSupabase, type Booking, type DayAvailability, type MonthAvailability, type Package, type Settings, type Venue } from "./supabase";

// ── Public reads ───────────────────────────────────────

export async function listPublicVenues(): Promise<Venue[]> {
  const { data, error } = await getSupabase()
    .from("venues")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`listPublicVenues: ${error.message}`);
  return (data || []) as Venue[];
}

export async function getPublicVenue(slug: string): Promise<Venue | null> {
  const { data, error } = await getSupabase()
    .from("venues")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`getPublicVenue: ${error.message}`);
  return (data as Venue) || null;
}

export async function listPublicPackages(venueId: string): Promise<Package[]> {
  const { data, error } = await getSupabase()
    .from("packages")
    .select("*")
    .eq("venue_id", venueId)
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`listPublicPackages: ${error.message}`);
  return (data || []) as Package[];
}

export async function getPublicSettings(): Promise<Settings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`getPublicSettings: ${error.message}`);
  if (!data) {
    // Should never happen — schema seeds the singleton row.
    return {
      id: 1,
      bank_name: null,
      bank_account_number: null,
      bank_account_name: null,
      whatsapp: "60137732703",
      email: "sagadigitaladvertising@gmail.com",
      company_name: "Saga X Ventures",
      signature_lines: ["Saga X Space", "Senawang, Negeri Sembilan"],
      resend_from: null,
      updated_at: new Date().toISOString(),
    };
  }
  return data as Settings;
}

// ── Availability ──────────────────────────────────────

const ACTIVE_STATUSES = new Set(["confirmed", "pending_payment", "pending_review"]);

export async function getMonthAvailability(venueId: string, month: string): Promise<MonthAvailability> {
  // month is "YYYY-MM"
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("month must be in YYYY-MM format");
  }

  // Inclusive [start, end] of the month
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await getSupabase()
    .from("bookings")
    .select("event_date, start_time, end_time, status")
    .eq("venue_id", venueId)
    .gte("event_date", start)
    .lte("event_date", end)
    .in("status", Array.from(ACTIVE_STATUSES));
  if (error) throw new Error(`getMonthAvailability: ${error.message}`);

  type DayRow = { bookings: number };
  const days: Record<string, DayRow> = {};
  for (let d = 1; d <= lastDay; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    days[date] = { bookings: 0 };
  }
  for (const row of (data || []) as Array<{ event_date: string }>) {
    if (!days[row.event_date]) continue;
    days[row.event_date].bookings += 1;
  }

  const list: DayAvailability[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const count = days[date]?.bookings ?? 0;
    list.push({ date, status: count >= 3 ? "fully_booked" : "available" });
  }

  return { month, days: list };
}

// ── Bookings (public create) ──────────────────────────

export async function createBooking(input: {
  reference: string;
  venue_id: string;
  package_id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  amount_cents: number;
  base_amount_cents: number;
  human_price: string;
  payment_method: "billplz" | "manual" | "bank_transfer";
  status: "pending_payment" | "pending_review";
}): Promise<Booking> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`createBooking: ${error.message}`);
  return data as Booking;
}

// ── Admin (service_role) ──────────────────────────────

export async function listAdminBookings(): Promise<Booking[]> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .select("*")
    .order("event_date", { ascending: false })
    .order("start_time", { ascending: false });
  if (error) throw new Error(`listAdminBookings: ${error.message}`);
  return (data || []) as Booking[];
}

export async function getAdminBooking(reference: string): Promise<Booking | null> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error(`getAdminBooking: ${error.message}`);
  return (data as Booking) || null;
}

export async function updateAdminBooking(
  reference: string,
  patch: Partial<Pick<Booking, "status" | "amount_cents" | "price_label" | "admin_note" | "payment_method" | "payment_reference">>
): Promise<Booking> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .update(patch)
    .eq("reference", reference)
    .select()
    .single();
  if (error) throw new Error(`updateAdminBooking: ${error.message}`);
  return data as Booking;
}

export async function listAdminVenues(): Promise<Venue[]> {
  const { data, error } = await getSupabase()
    .from("venues")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(`listAdminVenues: ${error.message}`);
  return (data || []) as Venue[];
}

export async function createAdminVenue(input: Omit<Venue, "id" | "created_at" | "updated_at">): Promise<Venue> {
  const { data, error } = await getSupabase()
    .from("venues")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(`createAdminVenue: ${error.message}`);
  return data as Venue;
}

export async function updateAdminVenue(id: string, patch: Partial<Venue>): Promise<Venue> {
  const { data, error } = await getSupabase()
    .from("venues")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateAdminVenue: ${error.message}`);
  return data as Venue;
}

export async function listAdminPackages(venueId?: string): Promise<Package[]> {
  let q = getSupabase().from("packages").select("*").order("display_order", { ascending: true });
  if (venueId) q = q.eq("venue_id", venueId);
  const { data, error } = await q;
  if (error) throw new Error(`listAdminPackages: ${error.message}`);
  return (data || []) as Package[];
}

export async function updateAdminPackage(id: string, patch: Partial<Package>): Promise<Package> {
  const { data, error } = await getSupabase()
    .from("packages")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`updateAdminPackage: ${error.message}`);
  return data as Package;
}

export async function updateAdminSettings(patch: Partial<Settings>): Promise<Settings> {
  const { data, error } = await getSupabase()
    .from("settings")
    .update(patch)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw new Error(`updateAdminSettings: ${error.message}`);
  return data as Settings;
}
