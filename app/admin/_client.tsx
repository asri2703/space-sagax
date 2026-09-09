"use client";

import { useEffect, useState, useCallback } from "react";
import "./admin.css";

type PackageKey = "hour" | "four" | "full";

type PackageOffer = {
  key: string;
  title: string;
  copy: string;
  base_amount_cents: number;
  base_human_price: string;
  amount_cents: number;
  human_price: string;
  promo_label: string;
  is_promo: boolean;
};

type AdminSettings = {
  package_overrides: Record<PackageKey, { amount_cents: number; label: string; updated_at: string } | null>;
};

type PublicConfig = {
  site_name: string;
  company_name: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp: string;
  payment_qr_url: string;
  packages: Record<PackageKey, PackageOffer>;
};

type Booking = {
  reference: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  event_date?: string;
  start_time?: string;
  package_title?: string;
  package_key?: string;
  amount_cents?: number;
  base_amount_cents?: number;
  status?: string;
  payment_method?: string;
  event_type?: string;
  notes?: string;
  pax?: number | null;
  created_at?: string;
};

const PACKAGE_ORDER: PackageKey[] = ["hour", "four", "full"];

function formatMyr(cents: number) {
  return `RM${(Number(cents || 0) / 100).toFixed(2)}`;
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _escapeHtmlRef = escapeHtml;

export default function AdminClient() {
  const [adminKey, setAdminKey] = useState<string>("");
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [status, setStatus] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);

  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedReference, setSelectedReference] = useState<string>("");

  // Load admin key from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("sagax-admin-key");
    if (stored) {
      setAdminKey(stored);
      // attempt auto-unlock
      void tryUnlock(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const api = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };
      if (adminKey) headers["x-admin-key"] = adminKey;
      const response = await fetch(path, { ...options, headers });
      let data: any = null;
      try { data = await response.json(); } catch { /* not JSON */ }
      if (!response.ok) {
        const message = (data && data.error) || `Request failed (${response.status})`;
        throw new Error(message);
      }
      return data;
    },
    [adminKey],
  );

  const tryUnlock = useCallback(async (key: string) => {
    try {
      const tempKey = key;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-admin-key": tempKey,
      };
      const bookingsResponse = await fetch("/api/admin/bookings", { headers });
      if (!bookingsResponse.ok) {
        const data = await bookingsResponse.json().catch(() => null);
        throw new Error(data?.error || `Login failed (${bookingsResponse.status})`);
      }
      const bookingsData = await bookingsResponse.json();
      const settingsResponse = await fetch("/api/admin/settings", { headers });
      if (!settingsResponse.ok) {
        throw new Error("Settings fetch failed");
      }
      const settingsData = await settingsResponse.json();
      setBookings(bookingsData.items || []);
      setSettings(settingsData.settings);
      setPublicConfig(settingsData.public);
      if (bookingsData.items && bookingsData.items.length > 0) {
        setSelectedReference(bookingsData.items[0].reference);
      }
      setUnlocked(true);
      setStatus({ kind: "success", text: "Admin dashboard unlocked." });
      sessionStorage.setItem("sagax-admin-key", tempKey);
    } catch (e) {
      setUnlocked(false);
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Login failed." });
      sessionStorage.removeItem("sagax-admin-key");
    }
  }, []);

  function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminKey.trim()) {
      setStatus({ kind: "error", text: "Please enter the admin access key." });
      return;
    }
    void tryUnlock(adminKey.trim());
  }

  function handleLogout() {
    setUnlocked(false);
    setAdminKey("");
    setBookings([]);
    setSettings(null);
    setPublicConfig(null);
    setSelectedReference("");
    sessionStorage.removeItem("sagax-admin-key");
    setStatus({ kind: "info", text: "Logged out." });
  }

  // --- Pricing ---
  const [promoAmounts, setPromoAmounts] = useState<Record<PackageKey, string>>({ hour: "", four: "", full: "" });
  const [promoLabels, setPromoLabels] = useState<Record<PackageKey, string>>({ hour: "", four: "", full: "" });

  useEffect(() => {
    if (!settings) return;
    const amounts: Record<PackageKey, string> = { hour: "", four: "", full: "" };
    const labels: Record<PackageKey, string> = { hour: "", four: "", full: "" };
    for (const key of PACKAGE_ORDER) {
      const override = settings.package_overrides?.[key];
      if (override) {
        amounts[key] = (override.amount_cents / 100).toFixed(2);
        labels[key] = override.label || "";
      }
    }
    setPromoAmounts(amounts);
    setPromoLabels(labels);
  }, [settings]);

  async function savePricing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: Record<string, unknown> = { package_overrides: {} };
    const overrides: Record<string, unknown> = {};
    for (const key of PACKAGE_ORDER) {
      const rawAmount = promoAmounts[key];
      const label = promoLabels[key];
      if (rawAmount && Number(rawAmount) > 0) {
        const cents = Math.round(Number(rawAmount) * 100);
        overrides[key] = { amount_cents: cents, label: label || "" };
      } else {
        overrides[key] = null;
      }
    }
    body.package_overrides = overrides;
    try {
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify(body) });
      // refresh
      const fresh = await api("/api/admin/settings");
      setSettings(fresh.settings);
      setPublicConfig(fresh.public);
      setStatus({ kind: "success", text: "Pricing updated." });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Save failed." });
    }
  }

  // --- Booking actions ---
  const selectedBooking = bookings.find((b) => b.reference === selectedReference) || null;

  async function patchBooking(reference: string, payload: Record<string, unknown>) {
    try {
      const data = await api(`/api/admin/bookings/${encodeURIComponent(reference)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const updated: Booking = data.booking;
      setBookings((prev) => prev.map((b) => (b.reference === reference ? updated : b)));
      setStatus({ kind: "success", text: `Booking ${reference} updated.` });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Update failed." });
    }
  }

  async function resendBooking(reference: string) {
    try {
      await api(`/api/admin/bookings/${encodeURIComponent(reference)}/resend`, { method: "POST" });
      setStatus({ kind: "success", text: `Invoice email resent for ${reference}.` });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Resend failed." });
    }
  }

  function buildWhatsappUrl(booking: Booking): string {
    const text = [
      `Saga X Space booking ${booking.reference}`,
      `Name: ${booking.name || "?"}`,
      `Date: ${booking.event_date || "?"} at ${booking.start_time || "?"}`,
      `Package: ${booking.package_title || "?"}`,
      `Amount: ${formatMyr(booking.amount_cents || 0)}`,
      `Status: ${booking.status || "?"}`,
    ].join("\n");
    const phone = publicConfig?.whatsapp || "60137732703";
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="page-shell admin-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"></div>
          <div>
            <strong>Saga X Ventures</strong>
            <span>Admin control</span>
          </div>
        </div>

        <nav className="topnav" aria-label="Admin primary">
          <a href="#pricing">Pricing</a>
          <a href="#bookings">Bookings</a>
          <a href="#notifications">Notifications</a>
        </nav>

        <a className="btn btn-ghost" href="/" rel="noreferrer">Public site</a>
      </header>

      <main className="admin-main">
        <section className="section admin-hero">
          <div className="section-heading">
            <p className="eyebrow">Admin dashboard</p>
            <h1>Keep default pricing intact, then layer promo pricing when needed.</h1>
            <p>
              The base price list stays fixed at RM60, RM180, and RM300. When you need a special rate,
              set a promo price here and the booking page will pick it up automatically.
            </p>
          </div>

          {!unlocked && (
            <form className="admin-login" onSubmit={handleUnlock}>
              <label>
                Admin access key
                <input
                  id="admin-key"
                  type="password"
                  placeholder="Enter ADMIN_ACCESS_KEY"
                  autoComplete="current-password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </label>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit">Unlock admin</button>
                <p>Key is stored in session only for this browser tab.</p>
              </div>
            </form>
          )}

          {unlocked && (
            <div className="admin-logged-in">
              <span className="badge badge-accent">Unlocked</span>
              <button className="btn btn-ghost" type="button" onClick={handleLogout}>Lock dashboard</button>
            </div>
          )}

          {status && (
            <div className={`admin-status admin-status-${status.kind}`} role="status">
              {status.text}
            </div>
          )}
        </section>

        {unlocked && (
          <>
            <section id="pricing" className="section admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Pricing control</p>
                <h2>Set promo pricing per package.</h2>
                <p>
                  Leave a package blank to keep the default price list. Add a promo price only when you want a special offer.
                </p>
              </div>

              <form onSubmit={savePricing} className="admin-price-grid">
                {PACKAGE_ORDER.map((key) => {
                  const pkg = publicConfig?.packages?.[key];
                  if (!pkg) return null;
                  const isPromo = pkg.is_promo;
                  return (
                    <article key={key} className="admin-price-card">
                      <div className="admin-price-head">
                        <div>
                          <p className="admin-kicker">{pkg.title}</p>
                          <strong>{pkg.human_price}</strong>
                        </div>
                        <span className={`badge ${isPromo ? "badge-accent" : "badge-muted"}`}>
                          {isPromo ? pkg.promo_label || "Promo active" : "Default price"}
                        </span>
                      </div>

                      <div className="admin-price-meta">
                        <span>Base: {pkg.base_human_price}</span>
                        <span>Current: {pkg.human_price}</span>
                      </div>

                      <label>
                        Promo price (MYR)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={promoAmounts[key] || ""}
                          placeholder="Leave blank for default"
                          onChange={(e) => setPromoAmounts((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      </label>

                      <label>
                        Promo label
                        <input
                          type="text"
                          value={promoLabels[key] || ""}
                          placeholder="e.g. Promo March"
                          onChange={(e) => setPromoLabels((p) => ({ ...p, [key]: e.target.value }))}
                        />
                      </label>

                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setPromoAmounts((p) => ({ ...p, [key]: "" }));
                          setPromoLabels((p) => ({ ...p, [key]: "" }));
                        }}
                      >
                        Reset
                      </button>
                    </article>
                  );
                })}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save pricing</button>
                </div>
              </form>
            </section>

            <section id="bookings" className="section admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Bookings</p>
                <h2>Review requests and update special cases.</h2>
                <p>
                  You can change status, add admin notes, or resend the invoice after updates.
                </p>
              </div>

              <div className="admin-booking-layout">
                <div className="admin-bookings-list">
                  {bookings.length === 0 && <div className="empty-state">No bookings yet.</div>}
                  {bookings.map((booking) => (
                    <button
                      key={booking.reference}
                      type="button"
                      className={`admin-booking-item ${booking.reference === selectedReference ? "is-selected" : ""}`}
                      onClick={() => setSelectedReference(booking.reference)}
                    >
                      <span className="admin-booking-ref">{booking.reference}</span>
                      <strong>{booking.name || "Unnamed"}</strong>
                      <span>{booking.package_title || ""}</span>
                      <span>{booking.event_date || ""} at {booking.start_time || ""}</span>
                      <span className={`badge ${booking.status === "confirmed" ? "badge-accent" : "badge-muted"}`}>
                        {booking.status || ""}
                      </span>
                      <span>{formatMyr(booking.amount_cents || 0)}</span>
                    </button>
                  ))}
                </div>

                <aside className="admin-detail">
                  {!selectedBooking && <p className="muted-copy">Select a booking to see full details.</p>}
                  {selectedBooking && (
                    <>
                      <div className="admin-detail-head">
                        <div>
                          <p className="admin-kicker">{selectedBooking.reference}</p>
                          <h3>{selectedBooking.name || "Unnamed booking"}</h3>
                          <p className="muted-copy">{selectedBooking.package_title || ""}</p>
                        </div>
                        <span className={`badge ${selectedBooking.status === "confirmed" ? "badge-accent" : "badge-muted"}`}>
                          {selectedBooking.status || ""}
                        </span>
                      </div>

                      <div className="admin-detail-grid">
                        <div><span>Package</span><strong>{selectedBooking.package_title || ""}</strong></div>
                        <div><span>Event date</span><strong>{selectedBooking.event_date || ""}</strong></div>
                        <div><span>Start time</span><strong>{selectedBooking.start_time || ""}</strong></div>
                        <div><span>Payment</span><strong>{selectedBooking.payment_method || ""}</strong></div>
                        <div><span>Amount</span><strong>{formatMyr(selectedBooking.amount_cents || 0)}</strong></div>
                        <div><span>Base price</span><strong>{formatMyr(selectedBooking.base_amount_cents || selectedBooking.amount_cents || 0)}</strong></div>
                      </div>

                      <div className="admin-detail-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => patchBooking(selectedBooking.reference, { status: "confirmed" })}
                          disabled={selectedBooking.status === "confirmed"}
                        >
                          Mark confirmed
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => patchBooking(selectedBooking.reference, { status: "cancelled" })}
                          disabled={selectedBooking.status === "cancelled"}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => resendBooking(selectedBooking.reference)}
                        >
                          Resend invoice
                        </button>
                        <a
                          className="btn btn-ghost"
                          href={buildWhatsappUrl(selectedBooking)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp alert
                        </a>
                      </div>
                    </>
                  )}
                </aside>
              </div>
            </section>

            <section id="notifications" className="section admin-panel">
              <div className="section-heading">
                <p className="eyebrow">Notifications</p>
                <h2>WhatsApp alert shortcut ready.</h2>
                <p>
                  The system can generate a prefilled WhatsApp alert for{" "}
                  <strong>{publicConfig?.whatsapp || "60137732703"}</strong> so you can message the booking summary fast.
                </p>
              </div>

              <div className="notification-card">
                <strong>Tip</strong>
                <p>Click the WhatsApp button inside a booking to open a prefilled alert on mobile or desktop WhatsApp Web.</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}