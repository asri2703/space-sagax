// POST /api/bookings
//   Public booking creation. Validates input, generates a
//   reference, optionally creates a Billplz bill, and inserts the
//   booking row.

import { createBooking, getPublicVenue, listPublicPackages } from "@/lib/data";
import { generateBookingReference, formatDate } from "@/lib/format";
import { createBill, isBillplzConfigured } from "@/lib/billplz";

export const dynamic = "force-dynamic";

type CreateInput = {
  venue_slug: string;
  package_key: "hour" | "four" | "full";
  name: string;
  email?: string;
  whatsapp?: string;
  event_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  payment_method: "billplz" | "manual" | "bank_transfer";
};

function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateInput>;
    if (!body.venue_slug || !body.package_key || !body.name || !body.event_date || !body.start_time || !body.payment_method) {
      return bad("Missing required fields: venue_slug, package_key, name, event_date, start_time, payment_method");
    }
    if (!["hour", "four", "full"].includes(body.package_key)) return bad("Invalid package_key");
    if (!["billplz", "manual", "bank_transfer"].includes(body.payment_method)) return bad("Invalid payment_method");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) return bad("event_date must be YYYY-MM-DD");
    if (!/^\d{2}:\d{2}$/.test(body.start_time)) return bad("start_time must be HH:MM");
    if (!body.email && !body.whatsapp) return bad("At least one of email or whatsapp is required");

    const venue = await getPublicVenue(body.venue_slug);
    if (!venue) return bad("Venue not found", 404);

    const packages = await listPublicPackages(venue.id);
    const pkg = packages.find((p) => p.key === body.package_key);
    if (!pkg) return bad("Package not found for this venue", 404);

    // Calculate end_time from duration
    const startMinutes = timeToMinutes(body.start_time);
    const endMinutes = startMinutes + pkg.duration_minutes;
    const end_time = minutesToTime(endMinutes);

    const reference = generateBookingReference();

    // Optionally create a Billplz bill
    let billplz_bill_id: string | null = null;
    let billplz_bill_url: string | null = null;
    let status: "pending_payment" | "pending_review" = "pending_review";

    if (body.payment_method === "billplz") {
      if (!isBillplzConfigured()) {
        return bad("Billplz is not configured; choose manual or bank_transfer", 503);
      }
      const origin = new URL(request.url).origin;
      const bill = await createBill({
        email: body.email,
        mobile: body.whatsapp,
        name: body.name,
        amount_cents: pkg.amount_cents,
        callback_url: `${origin}/api/billplz/callback`,
        redirect_url: `${origin}/booking/confirmed?ref=${reference}`,
        description: `${venue.name} — ${pkg.title} on ${formatDate(body.event_date)}`,
        reference_1_label: "Booking reference",
        reference_1: reference,
        deliver: true,
      });
      billplz_bill_id = bill.id;
      billplz_bill_url = bill.url;
      status = "pending_payment";
    } else if (body.payment_method === "bank_transfer") {
      status = "pending_payment";
    }

    const booking = await createBooking({
      reference,
      venue_id: venue.id,
      package_id: pkg.id,
      name: body.name.trim(),
      email: body.email?.trim() || null,
      whatsapp: body.whatsapp?.trim() || null,
      event_date: body.event_date,
      start_time: body.start_time,
      end_time,
      amount_cents: pkg.amount_cents,
      base_amount_cents: pkg.amount_cents,
      human_price: pkg.human_price,
      payment_method: body.payment_method,
      status,
    });

    return Response.json({
      booking,
      billplz_bill_id,
      billplz_bill_url,
    });
  } catch (err) {
    console.error("[/api/bookings POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}
function minutesToTime(min: number): string {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
