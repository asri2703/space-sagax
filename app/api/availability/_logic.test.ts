import {
  computeMonthAvailability,
  daysInMonth,
  isValidMonth,
  resolveMonth,
  type BookingLike,
} from "./_logic.ts";
import { test } from "node:test";
import assert from "node:assert/strict";

function booking(partial: Partial<BookingLike> & { event_date: string }): BookingLike {
  return {
    start_time: "09:00",
    status: "pending_payment",
    ...partial,
  };
}

test("isValidMonth accepts YYYY-MM with 01-12", () => {
  assert.equal(isValidMonth("2026-01"), true);
  assert.equal(isValidMonth("2026-12"), true);
  assert.equal(isValidMonth("2026-09"), true);
});

test("isValidMonth rejects malformed input", () => {
  assert.equal(isValidMonth("2026-13"), false);
  assert.equal(isValidMonth("2026-00"), false);
  assert.equal(isValidMonth("26-9"), false);
  assert.equal(isValidMonth("2026/09"), false);
  assert.equal(isValidMonth(""), false);
  assert.equal(isValidMonth(null as unknown as string), false);
  assert.equal(isValidMonth(123 as unknown as string), false);
});

test("daysInMonth returns correct count per month", () => {
  assert.equal(daysInMonth("2026-01").length, 31);
  assert.equal(daysInMonth("2026-02").length, 28);
  assert.equal(daysInMonth("2024-02").length, 29); // leap year
  assert.equal(daysInMonth("2026-04").length, 30);
  assert.equal(daysInMonth("2026-12").length, 31);
  // February is always 28 for a non-leap year
  assert.equal(daysInMonth("2025-02").length, 28);
});

test("daysInMonth returns YYYY-MM-DD strings", () => {
  const days = daysInMonth("2026-09");
  assert.equal(days[0], "2026-09-01");
  assert.equal(days[days.length - 1], "2026-09-30");
});

test("computeMonthAvailability with no bookings: all days available", () => {
  const result = computeMonthAvailability("2026-09", []);
  assert.equal(result.month, "2026-09");
  assert.equal(result.timezone, "Asia/Kuala_Lumpur");
  assert.equal(Object.keys(result.days).length, 30);
  for (const day of Object.keys(result.days)) {
    assert.equal(result.days[day].status, "available");
    assert.equal(result.days[day].bookings, 0);
  }
});

test("computeMonthAvailability: a confirmed booking marks the day fully_booked", () => {
  const bookings: BookingLike[] = [booking({ event_date: "2026-09-15", status: "confirmed" })];
  const result = computeMonthAvailability("2026-09", bookings);
  assert.equal(result.days["2026-09-15"].status, "fully_booked");
  assert.equal(result.days["2026-09-15"].bookings, 1);
  assert.equal(result.days["2026-09-14"].status, "available");
});

test("computeMonthAvailability: cancelled bookings are ignored", () => {
  const bookings: BookingLike[] = [
    booking({ event_date: "2026-09-15", status: "cancelled" }),
    booking({ event_date: "2026-09-16", status: "CANCELLED" }), // case-insensitive not required, but acceptable
  ];
  const result = computeMonthAvailability("2026-09", bookings);
  assert.equal(result.days["2026-09-15"].status, "available");
  // The repo's normalization always lowercases to canonical form, but we
  // accept either. The ACTIVE_STATUSES set is canonical lowercase only,
  // so "CANCELLED" should be treated as cancelled.
  assert.equal(result.days["2026-09-16"].status, "available");
});

test("computeMonthAvailability: pending bookings count as active", () => {
  const bookings: BookingLike[] = [
    booking({ event_date: "2026-09-15", status: "pending_payment" }),
    booking({ event_date: "2026-09-15", status: "pending_review" }),
  ];
  const result = computeMonthAvailability("2026-09", bookings);
  assert.equal(result.days["2026-09-15"].status, "fully_booked");
  assert.equal(result.days["2026-09-15"].bookings, 2);
});

test("computeMonthAvailability: bookings outside the requested month are ignored", () => {
  const bookings: BookingLike[] = [
    booking({ event_date: "2026-08-31" }), // last day of August
    booking({ event_date: "2026-10-01" }), // first day of October
  ];
  const result = computeMonthAvailability("2026-09", bookings);
  for (const day of Object.keys(result.days)) {
    assert.equal(result.days[day].status, "available");
    assert.equal(result.days[day].bookings, 0);
  }
});

test("resolveMonth defaults to current UTC month when no param", () => {
  const r = resolveMonth(undefined);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.match(r.month, /^\d{4}-\d{2}$/);
  }
});

test("resolveMonth rejects invalid format", () => {
  const r = resolveMonth("not-a-month");
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.error, /Invalid month format/);
  }
});

test("resolveMonth accepts valid format", () => {
  const r = resolveMonth("2026-09");
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.month, "2026-09");
  }
});