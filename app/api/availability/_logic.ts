/**
 * Pure functions for computing calendar availability.
 *
 * No I/O, no environment, no global state — easy to unit test.
 *
 * Conventions:
 * - "Day" is identified by an event_date string in YYYY-MM-DD form,
 *   treated as KL local date (Asia/Kuala_Lumpur).
 * - A day is "fully_booked" when there is at least one CONFIRMED or
 *   PENDING booking for that day whose time range covers the requested
 *   time window. "available" otherwise. Cancelled bookings are ignored.
 */

export type BookingLike = {
  event_date?: string | null;
  start_time?: string | null;
  status?: string | null;
};

export type DayStatus = "available" | "fully_booked";

export type DayAvailability = {
  status: DayStatus;
  bookings: number;
};

export type AvailabilityResult = {
  month: string;
  timezone: string;
  days: Record<string, DayAvailability>;
};

export const TIMEZONE = "Asia/Kuala_Lumpur";
export const ACTIVE_STATUSES = new Set(["confirmed", "pending_payment", "pending_review"]);

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Validate a YYYY-MM month string. Returns true if it parses.
 * Does NOT validate that the month is not in the far past or future —
 * the calendar UI may legitimately request historical months for review.
 */
export function isValidMonth(month: string): boolean {
  return typeof month === "string" && MONTH_REGEX.test(month);
}

/**
 * Generate every YYYY-MM-DD string in a given month (inclusive).
 * Pure: no Date timezone surprises because we operate on string keys.
 */
export function daysInMonth(month: string): string[] {
  if (!isValidMonth(month)) return [];
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  // Last day: day 0 of next month = last day of current month
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const out: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dd = String(d).padStart(2, "0");
    out.push(`${month}-${dd}`);
  }
  return out;
}

/**
 * Compute availability for a month from a list of bookings.
 * Bookings with status in ACTIVE_STATUSES count; cancelled bookings do not.
 */
export function computeMonthAvailability(
  month: string,
  bookings: BookingLike[],
): AvailabilityResult {
  const days = daysInMonth(month);
  const map: Record<string, DayAvailability> = {};
  for (const day of days) {
    map[day] = { status: "available", bookings: 0 };
  }
  for (const booking of bookings) {
    const date = String(booking.event_date || "").trim();
    if (!date.startsWith(month)) continue;
    if (!ACTIVE_STATUSES.has(String(booking.status || ""))) continue;
    if (!map[date]) continue; // outside this month — skip
    map[date].bookings += 1;
    map[date].status = "fully_booked";
  }
  return {
    month,
    timezone: TIMEZONE,
    days: map,
  };
}

/**
 * Resolve the requested month from query params.
 * Returns { ok: true, month } or { ok: false, error }.
 */
export function resolveMonth(rawMonth: unknown): { ok: true; month: string } | { ok: false; error: string } {
  if (rawMonth == null || rawMonth === "") {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    return { ok: true, month: `${y}-${m}` };
  }
  const s = String(rawMonth);
  if (!isValidMonth(s)) {
    return { ok: false, error: "Invalid month format, expected YYYY-MM" };
  }
  return { ok: true, month: s };
}