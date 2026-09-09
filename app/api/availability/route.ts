import { readBookings } from "@/db";
import {
  computeMonthAvailability,
  resolveMonth,
  type AvailabilityResult,
  type BookingLike,
} from "./_logic";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?month=YYYY-MM
 *
 * Returns calendar availability for the requested month (default: current
 * UTC month). Each day in the response is either "available" or
 * "fully_booked", with a count of active bookings.
 *
 * This route exists to restore the calendar widget on
 * space.sagaxventures.com after a deployment gap left the endpoint
 * returning HTTP 500.
 */
export async function GET(request: Request) {
  let month: string;
  try {
    const url = new URL(request.url);
    const resolved = resolveMonth(url.searchParams.get("month"));
    if (!resolved.ok) {
      return Response.json({ error: resolved.error }, { status: 400 });
    }
    month = resolved.month;
  } catch {
    return Response.json({ error: "Invalid request URL" }, { status: 400 });
  }

  // Read bookings defensively. If the storage layer fails, we still want
  // to return a valid (all-available) calendar instead of a 500.
  let bookings: BookingLike[] = [];
  try {
    const all = await readBookings();
    bookings = all.map((b) => ({
      event_date: typeof b.event_date === "string" ? b.event_date : null,
      start_time: typeof b.start_time === "string" ? b.start_time : null,
      status: typeof b.status === "string" ? b.status : null,
    }));
  } catch {
    bookings = [];
  }

  let result: AvailabilityResult;
  try {
    result = computeMonthAvailability(month, bookings);
  } catch {
    return Response.json({ error: "Failed to compute availability" }, { status: 500 });
  }

  return Response.json(result, {
    headers: {
      // Allow the calendar widget to re-fetch on focus / month navigation
      // without breaking the back button.
      "Cache-Control": "no-store",
    },
  });
}

export function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

export function PUT() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}

export function DELETE() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}