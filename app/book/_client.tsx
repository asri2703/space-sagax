"use client";

// Public booking flow. Step 1: pick date. Step 2: pick time + package.
// Step 3: enter contact. Step 4: payment method. Step 5: confirm.
//
// All state local; submit POSTs to /api/bookings and either redirects
// to Billplz (for billplz payment) or shows a confirmation page
// (for manual / bank_transfer).

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Booking, Package, Venue, DayAvailability, MonthAvailability } from "@/lib/supabase";
import { formatMyr, formatDate } from "@/lib/format";

type Settings = {
  company_name: string;
  whatsapp: string;
  email: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
};

type Props = {
  venue: Venue;
  packages: Package[];
  initialAvailability: MonthAvailability;
  initialMonth: string;
  settings: Settings;
};

type Step = 1 | 2 | 3 | 4 | 5;

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00",
];

export function BookingFlow({ venue, packages, initialAvailability, initialMonth, settings }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [availability, setAvailability] = useState<MonthAvailability>(initialAvailability);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [date, setDate] = useState<string | null>(null);
  const [pkgKey, setPkgKey] = useState<"hour" | "four" | "full" | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [payment, setPayment] = useState<"billplz" | "bank_transfer" | "manual">("billplz");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reload availability when month changes
  useEffect(() => {
    let cancelled = false;
    async function go() {
      setLoading(true);
      try {
        const r = await fetch(`/api/availability?venue=${venue.slug}&month=${month}`);
        if (!r.ok) throw new Error(`Failed: ${r.status}`);
        const data = (await r.json()) as MonthAvailability;
        if (!cancelled) setAvailability(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    go();
    return () => {
      cancelled = true;
    };
  }, [month, venue.slug]);

  const days = useMemo(() => buildCalendar(month, availability), [month, availability]);

  const selectedPkg = packages.find((p) => p.key === pkgKey) || null;

  const onSubmit = useCallback(async () => {
    setError(null);
    if (!date || !pkgKey || !time || !name) {
      setError("Please complete all required fields");
      return;
    }
    if (!email && !whatsapp) {
      setError("Please provide at least an email or WhatsApp number");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_slug: venue.slug,
          package_key: pkgKey,
          name,
          email: email || undefined,
          whatsapp: whatsapp || undefined,
          event_date: date,
          start_time: time,
          payment_method: payment,
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as { booking: Booking; billplz_bill_url: string | null };
      if (data.billplz_bill_url) {
        window.location.href = data.billplz_bill_url;
        return;
      }
      // Manual / bank transfer: jump to confirmed page
      router.push(`/booking/confirmed?ref=${data.booking.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [date, pkgKey, time, name, email, whatsapp, payment, venue.slug, router]);

  return (
    <div className="booking-flow">
      <ol className="stepper" aria-label="Booking progress">
        {(["Pick a date", "Time & package", "Your details", "Payment", "Confirm"] as const).map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className={`stepper-item ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
              <span className="stepper-bubble">{done ? "✓" : n}</span>
              <span className="stepper-label">{label}</span>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="card card-sticker">
          <h2 className="card-title">Pick a date</h2>
          <div className="calendar-toolbar">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
            >←</button>
            <strong className="calendar-month-label">{formatMonthLabel(month)}</strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label="Next month"
            >→</button>
          </div>
          {loading && <p className="muted">Loading…</p>}
          <div className="calendar">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="calendar-head">{d}</div>
            ))}
            {days.map((day) => {
              if (!day) {
                return <div key={`empty-${Math.random()}`} className="calendar-day empty" aria-hidden />;
              }
              const isToday = day.date === todayISO();
              const isPast = day.date < todayISO();
              const isFull = day.status === "fully_booked";
              const isBooked = day.status === "fully_booked";
              const isSelected = date === day.date;
              return (
                <button
                  key={day.date}
                  type="button"
                  className={`calendar-day ${isSelected ? "is-selected" : ""} ${isFull ? "is-full" : ""} ${isPast ? "is-past" : ""}`}
                  disabled={isPast || isFull}
                  onClick={() => {
                    if (isPast || isFull) return;
                    setDate(day.date);
                    setStep(2);
                  }}
                >
                  <span className="calendar-day-num">{Number(day.date.slice(-2))}</span>
                  {isToday && <span className="badge badge-mint calendar-day-badge">today</span>}
                  {isBooked && <span className="badge badge-rose calendar-day-badge">full</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && date && (
        <div className="card card-sticker">
          <h2 className="card-title">Time & package</h2>
          <p className="muted">Date: <strong>{formatDate(date)}</strong> · <button type="button" className="link" onClick={() => setStep(1)}>change</button></p>

          <div className="form-row">
            <label className="form-label">Package</label>
            <div className="package-list">
              {packages.map((p) => (
                <label key={p.id} className={`package-option ${pkgKey === p.key ? "is-selected" : ""}`}>
                  <input
                    type="radio"
                    name="package"
                    value={p.key}
                    checked={pkgKey === p.key}
                    onChange={() => setPkgKey(p.key as never)}
                  />
                  <div>
                    <strong>{p.title}</strong>
                    <p className="muted">{p.description}</p>
                  </div>
                  <span className="price">{formatMyr(p.amount_cents)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="time-slot">Start time</label>
            <select
              id="time-slot"
              className="input"
              value={time || ""}
              onChange={(e) => setTime(e.target.value || null)}
            >
              <option value="">Choose a time…</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="action-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button type="button" className="btn btn-primary" disabled={!pkgKey || !time} onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card card-sticker">
          <h2 className="card-title">Your details</h2>
          <div className="form-row">
            <label className="form-label" htmlFor="name">Full name *</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-row form-row-2">
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="whatsapp">WhatsApp</label>
              <input id="whatsapp" className="input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+60123456789" />
            </div>
          </div>
          <p className="muted small">At least one is required so we can send your booking confirmation.</p>

          <div className="action-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button type="button" className="btn btn-primary" disabled={!name} onClick={() => setStep(4)}>Next →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card card-sticker">
          <h2 className="card-title">Payment</h2>
          <div className="form-row">
            <label className="form-label">How would you like to pay?</label>
            <div className="package-list">
              <label className={`package-option ${payment === "billplz" ? "is-selected" : ""}`}>
                <input type="radio" name="payment" checked={payment === "billplz"} onChange={() => setPayment("billplz")} />
                <div>
                  <strong>Billplz (FPX / card)</strong>
                  <p className="muted">Pay online and lock the date instantly.</p>
                </div>
              </label>
              <label className={`package-option ${payment === "bank_transfer" ? "is-selected" : ""}`}>
                <input type="radio" name="payment" checked={payment === "bank_transfer"} onChange={() => setPayment("bank_transfer")} />
                <div>
                  <strong>Bank transfer</strong>
                  <p className="muted">
                    {settings.bank_name ? `${settings.bank_name}${settings.bank_account_number ? ` (${settings.bank_account_number})` : ""}` : "We'll send bank details by email."}
                  </p>
                </div>
              </label>
              <label className={`package-option ${payment === "manual" ? "is-selected" : ""}`}>
                <input type="radio" name="payment" checked={payment === "manual"} onChange={() => setPayment("manual")} />
                <div>
                  <strong>Pay at the venue</strong>
                  <p className="muted">Pay cash on the day of your event.</p>
                </div>
              </label>
            </div>
          </div>

          {selectedPkg && (
            <div className="summary-card">
              <h3 className="summary-title">Summary</h3>
              <dl className="summary-list">
                <div><dt>Venue</dt><dd>{venue.name}</dd></div>
                <div><dt>Date</dt><dd>{formatDate(date!)}</dd></div>
                <div><dt>Time</dt><dd>{time} · {selectedPkg.title}</dd></div>
                <div><dt>Name</dt><dd>{name}</dd></div>
                <div className="summary-total"><dt>Total</dt><dd>{formatMyr(selectedPkg.amount_cents)}</dd></div>
              </dl>
            </div>
          )}

          {error && <p className="alert alert-error">{error}</p>}

          <div className="action-row">
            <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={onSubmit}>
              {submitting ? "Submitting…" : (payment === "billplz" ? "Continue to Billplz →" : "Confirm booking →")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- calendar helpers (pure) -----------------------------------------------

type DayCell = { date: string; status: DayAvailability["status"] } | null;

function buildCalendar(month: string, availability: MonthAvailability): DayCell[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startWeekday = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  const map = new Map(availability.days.map((d: { date: string; status: DayAvailability["status"] }) => [d.date, d.status]));
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    cells.push({ date: iso, status: map.get(iso) || "available" });
  }
  return cells;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-MY", { month: "long", year: "numeric" });
}
