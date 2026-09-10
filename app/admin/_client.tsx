"use client";

// Admin client component. Owns login state, bookings list, the
// active booking panel (status, custom invoice, share).
//
// Auth: shared key. On submit we POST to /api/admin/login which sets
// a HttpOnly cookie. We don't read the cookie from JS — we just
// retry the data fetch and let the API tell us if we're 401'd.

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Booking, Venue, Package } from "@/lib/supabase";
import { formatMyr, formatDate } from "@/lib/format";
import "./admin.css";

type Settings = {
  company_name: string;
  whatsapp: string;
  email: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  resend_from: string;
  signature_lines: string[];
};

type Tab = "bookings" | "venues" | "settings";

export function AdminClient() {
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // ── unlock ------------------------------------------------------------
  const tryUnlock = useCallback(async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      setAuthed(true);
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setUnlocking(false);
    }
  }, [key]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setKey("");
    setBookings([]);
  }, []);

  // ── data loaders ------------------------------------------------------
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, v, s] = await Promise.all([
        fetch("/api/admin/bookings").then(checkAuth),
        fetch("/api/admin/venues").then(checkAuth),
        fetch("/api/admin/settings").then(checkAuth),
      ]);
      const bookingsJson = (await b.json()) as { bookings: Booking[] };
      const venuesJson = (await v.json()) as { venues: Venue[] };
      const settingsJson = (await s.json()) as { settings: Settings };
      setBookings(bookingsJson.bookings || []);
      setVenues(venuesJson.venues || []);
      setSettings(settingsJson.settings);
      // Load packages for the first venue
      if (venuesJson.venues[0]) {
        const pk = await fetch(`/api/admin/packages?venue=${venuesJson.venues[0].id}`).then(checkAuth);
        const pkJson = (await pk.json()) as { packages: Package[] };
        setPackages(pkJson.packages || []);
      }
    } catch (err) {
      showToast("err", err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

  // ── toasts ------------------------------------------------------------
  function showToast(kind: "ok" | "err", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const activeBooking = useMemo(
    () => bookings.find((b) => b.reference === activeRef) || null,
    [bookings, activeRef]
  );

  // ── render ------------------------------------------------------------
  if (!authed) {
    return (
      <div className="admin-unlock">
        <div className="card card-sticker admin-unlock-card">
          <h1 className="display-2">Admin access</h1>
          <p className="muted">Enter your access key to unlock the dashboard.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              tryUnlock();
            }}
          >
            <label className="form-label" htmlFor="admin-key">Access key</label>
            <input
              id="admin-key"
              className="input"
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={unlocking}
            />
            {unlockError && <p className="alert alert-error">{unlockError}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={unlocking || !key}>
              {unlocking ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-main">
      <div className="admin-tabs">
        {(["bookings", "venues", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab ${activeTab === t ? "is-active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-pill admin-logout" onClick={handleLogout}>Log out</button>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {activeTab === "bookings" && (
        <BookingsTab
          bookings={bookings}
          venues={venues}
          packages={packages}
          settings={settings!}
          activeRef={activeRef}
          setActiveRef={setActiveRef}
          activeBooking={activeBooking}
          onRefresh={loadAll}
          onToast={showToast}
        />
      )}

      {activeTab === "venues" && (
        <VenuesTab venues={venues} packages={packages} onRefresh={loadAll} onToast={showToast} />
      )}

      {activeTab === "settings" && settings && (
        <SettingsTab settings={settings} onSave={async (patch) => {
          try {
            const r = await fetch("/api/admin/settings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            });
            checkAuth(r);
            if (!r.ok) {
              const j = (await r.json().catch(() => null)) as { error?: string } | null;
              throw new Error(j?.error || `HTTP ${r.status}`);
            }
            const data = (await r.json()) as { settings: Settings };
            setSettings(data.settings);
            showToast("ok", "Settings saved");
          } catch (err) {
            showToast("err", err instanceof Error ? err.message : "Save failed");
          }
        }} onToast={showToast} />
      )}

      {toast && (
        <div className={`admin-toast admin-toast-${toast.kind}`} role="status">{toast.msg}</div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────

async function checkAuth(r: Response): Promise<Response> {
  if (r.status === 401) {
    throw new Error("Admin session expired. Please log in again.");
  }
  if (!r.ok) {
    const j = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new Error(j?.error || `HTTP ${r.status}`);
  }
  return r;
}

// ── bookings tab ──────────────────────────────────────────────────────

type BookingsTabProps = {
  bookings: Booking[];
  venues: Venue[];
  packages: Package[];
  settings: Settings;
  activeRef: string | null;
  setActiveRef: (r: string | null) => void;
  activeBooking: Booking | null;
  onRefresh: () => Promise<void>;
  onToast: (kind: "ok" | "err", msg: string) => void;
};

function BookingsTab(props: BookingsTabProps) {
  const { bookings, venues, activeRef, setActiveRef, activeBooking, onRefresh, onToast } = props;
  return (
    <div className="admin-grid">
      <aside className="admin-list">
        <h2 className="kicker">Bookings</h2>
        {bookings.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <ul className="admin-list-items">
            {bookings.map((b) => {
              const venue = venues.find((v) => v.id === b.venue_id);
              const isActive = b.reference === activeRef;
              return (
                <li key={b.reference}>
                  <button
                    type="button"
                    className={`admin-list-item ${isActive ? "is-active" : ""}`}
                    onClick={() => setActiveRef(b.reference)}
                  >
                    <strong className="admin-list-ref">{b.reference}</strong>
                    <span className="admin-list-name">{b.name}</span>
                    <span className="admin-list-meta">
                      {formatDate(b.event_date)} · {b.start_time} · {venue?.name || "—"}
                    </span>
                    <span className={`status-pill status-${b.status}`}>{b.status.replace("_", " ")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="admin-detail">
        {activeBooking ? (
          <BookingDetail
            booking={activeBooking}
            venue={venues.find((v) => v.id === activeBooking.venue_id) || null}
            settings={props.settings}
            onRefresh={onRefresh}
            onToast={onToast}
          />
        ) : (
          <div className="card card-sticker card-empty">
            <p className="muted">Select a booking on the left to view or edit it.</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ── booking detail ────────────────────────────────────────────────────

function BookingDetail({
  booking,
  venue,
  settings,
  onRefresh,
  onToast,
}: {
  booking: Booking;
  venue: Venue | null;
  settings: Settings;
  onRefresh: () => Promise<void>;
  onToast: (kind: "ok" | "err", msg: string) => void;
}) {
  const [statusDraft, setStatusDraft] = useState(booking.status);
  const [adminNote, setAdminNote] = useState(booking.admin_note || "");
  const [amountDraft, setAmountDraft] = useState((booking.amount_cents || 0) / 100);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setStatusDraft(booking.status);
    setAdminNote(booking.admin_note || "");
    setAmountDraft((booking.amount_cents || 0) / 100);
  }, [booking.reference]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/bookings/${booking.reference}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      checkAuth(r);
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      await onRefresh();
      onToast("ok", "Saved");
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [booking.reference, onRefresh, onToast]);

  const downloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      const r = await fetch(`/api/admin/invoice/${booking.reference}/pdf`);
      checkAuth(r);
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${booking.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast("ok", `Invoice ${booking.reference} downloaded`);
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }, [booking.reference, onToast]);

  const resendEmail = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/bookings/${booking.reference}/resend`, { method: "POST" });
      checkAuth(r);
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      onToast("ok", "Email queued");
    } catch (err) {
      onToast("err", err instanceof Error ? err.message : "Email failed");
    }
  }, [booking.reference, onToast]);

  const whatsappLink = useMemo(() => {
    if (!booking.whatsapp) return null;
    const phone = booking.whatsapp.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hi ${booking.name}, ini ${settings.company_name} tentang booking ${booking.reference} (${formatDate(booking.event_date)} ${booking.start_time}).`
    );
    return `https://wa.me/${phone}?text=${text}`;
  }, [booking, settings.company_name]);

  return (
    <div className="card card-sticker">
      <header className="admin-detail-head">
        <div>
          <h2 className="display-2">{booking.reference}</h2>
          <p className="muted">{venue?.name || "—"} · {booking.name}</p>
        </div>
        <span className={`status-pill status-${booking.status}`}>{booking.status.replace("_", " ")}</span>
      </header>

      <dl className="admin-detail-summary">
        <div><dt>Date</dt><dd>{formatDate(booking.event_date)}</dd></div>
        <div><dt>Time</dt><dd>{booking.start_time} – {booking.end_time}</dd></div>
        <div><dt>Package</dt><dd>{booking.human_price}</dd></div>
        <div><dt>Amount</dt><dd>{formatMyr(booking.amount_cents)}</dd></div>
        <div><dt>Email</dt><dd>{booking.email || "—"}</dd></div>
        <div><dt>WhatsApp</dt><dd>{booking.whatsapp || "—"}</dd></div>
        <div><dt>Payment</dt><dd>{booking.payment_method}</dd></div>
        <div><dt>Created</dt><dd>{new Date(booking.created_at).toLocaleString()}</dd></div>
      </dl>

      <div className="admin-detail-row">
        <span className="admin-kicker">Status</span>
        <div className="admin-status-row">
          <select className="input input-sm" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as never)}>
            <option value="pending_payment">Pending payment</option>
            <option value="pending_review">Pending review</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={saving || statusDraft === booking.status}
            onClick={() => patch({ status: statusDraft })}
          >Save status</button>
          {booking.status !== "confirmed" && (
            <button
              type="button"
              className="btn btn-confirm btn-sm"
              disabled={saving}
              onClick={() => patch({ status: "confirmed" })}
            >Confirm &amp; lock date</button>
          )}
          {booking.status !== "cancelled" && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={saving}
              onClick={() => patch({ status: "cancelled" })}
            >Cancel booking</button>
          )}
        </div>
      </div>

      <div className="admin-detail-row">
        <span className="admin-kicker">Custom invoice</span>
        <div className="form-row">
          <label className="form-label" htmlFor="amount">Amount (RM)</label>
          <input
            id="amount"
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={amountDraft}
            onChange={(e) => setAmountDraft(Number(e.target.value))}
          />
          <div className="action-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={saving || amountDraft === (booking.amount_cents || 0) / 100}
              onClick={() => patch({ amount_cents: Math.round(amountDraft * 100) })}
            >Update amount</button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={saving}
              onClick={() => patch({ amount_cents: booking.base_amount_cents })}
            >Reset to base</button>
          </div>
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor="admin-note">Admin note (printed on invoice &amp; email)</label>
          <textarea
            id="admin-note"
            className="input"
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={saving || adminNote === (booking.admin_note || "")}
            onClick={() => patch({ admin_note: adminNote })}
          >Save note</button>
        </div>
      </div>

      <div className="admin-detail-row">
        <span className="admin-kicker">Send &amp; share</span>
        <div className="action-row">
          <button type="button" className="btn btn-primary btn-sm" disabled={downloading} onClick={downloadPdf}>
            {downloading ? "Generating PDF…" : "Download invoice (PDF)"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resendEmail}>
            Resend email
          </button>
          {whatsappLink && (
            <a className="btn btn-ghost btn-sm" href={whatsappLink} target="_blank" rel="noopener noreferrer">
              Open WhatsApp
            </a>
          )}
          {booking.email && (
            <a className="btn btn-ghost btn-sm" href={`mailto:${booking.email}?subject=Booking ${booking.reference}`}>
              Email client
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── venues tab (placeholder; full CRUD can be expanded) ───────────────

function VenuesTab({ venues, packages }: { venues: Venue[]; packages: Package[]; onRefresh: () => Promise<void>; onToast: (k: "ok" | "err", m: string) => void; }) {
  return (
    <div className="admin-venues">
      <h2 className="display-2">Venues</h2>
      <div className="venue-grid">
        {venues.map((v) => (
          <div key={v.id} className="card card-sticker">
            <h3 className="card-title">{v.name}</h3>
            <p className="muted">/{v.slug} · {v.city || "—"}</p>
            <p className="card-body">{v.short_description || v.description}</p>
            {v.capacity && <p className="card-meta">Capacity: {v.capacity} pax</p>}
          </div>
        ))}
      </div>
      {packages.length > 0 && (
        <>
          <h2 className="display-2">Packages</h2>
          <div className="package-grid">
            {packages.map((p) => (
              <div key={p.id} className="card card-pop">
                <h3 className="card-title">{p.title}</h3>
                <p className="price">{formatMyr(p.amount_cents)}</p>
                <p className="muted">{p.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── settings tab ──────────────────────────────────────────────────────

function SettingsTab({ settings, onSave, onToast }: { settings: Settings; onSave: (patch: Partial<Settings>) => Promise<void>; onToast: (k: "ok" | "err", m: string) => void; }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  return (
    <div className="card card-sticker">
      <h2 className="display-2">Settings</h2>
      <div className="form-row form-row-2">
        <div>
          <label className="form-label">Company name</label>
          <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
        <div>
          <label className="form-label">WhatsApp</label>
          <input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Resend from</label>
          <input className="input" value={form.resend_from} onChange={(e) => setForm({ ...form, resend_from: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Bank name</label>
          <input className="input" value={form.bank_name || ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Bank account number</label>
          <input className="input" value={form.bank_account_number || ""} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Bank account name</label>
          <input className="input" value={form.bank_account_name || ""} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <label className="form-label">Signature lines (one per line)</label>
        <textarea
          className="input"
          rows={4}
          value={form.signature_lines.join("\n")}
          onChange={(e) => setForm({ ...form, signature_lines: e.target.value.split("\n") })}
        />
      </div>
      <div className="action-row">
        <button type="button" className="btn btn-ghost" onClick={() => setForm(settings)}>Reset</button>
        <button type="button" className="btn btn-primary" onClick={async () => {
          await onSave({
            company_name: form.company_name,
            whatsapp: form.whatsapp,
            email: form.email,
            resend_from: form.resend_from,
            bank_name: form.bank_name,
            bank_account_number: form.bank_account_number,
            bank_account_name: form.bank_account_name,
            signature_lines: form.signature_lines,
          });
        }}>Save</button>
      </div>
    </div>
  );
}
