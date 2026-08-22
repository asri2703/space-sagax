"use client";

import { useEffect, useMemo, useState } from "react";
import { SpotlightSurface } from "@/components/spotlight-surface";

type Override = {
  amount_cents: number;
  label: string;
  updated_at: string;
} | null;

type PublicPackage = {
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

type PublicConfig = {
  packages: Record<string, PublicPackage>;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp: string;
  payment_qr_url: string;
};

type Booking = Record<string, unknown> & {
  reference: string;
  name?: string;
  status?: string;
  package_title?: string;
  event_date?: string;
  start_time?: string;
  human_price?: string;
  amount_cents?: number;
  email?: string;
  payment_method?: string;
  whatsapp_alert_url?: string;
  whatsapp_alert_text?: string;
  admin_note?: string;
  price_label?: string;
};

type AdminSettings = {
  package_overrides: {
    hour: Override;
    four: Override;
    full: Override;
  };
};

const packageOrder = ["hour", "four", "full"] as const;

function formatMyr(amountCents = 0) {
  return `RM${(Number(amountCents || 0) / 100).toFixed(2)}`;
}

function PricingCard({
  packageKey,
  data,
  override,
  onSave,
  onReset,
}: {
  packageKey: string;
  data?: PublicPackage;
  override: Override;
  onSave: (packageKey: string, amountCents: number | null, label: string) => Promise<void>;
  onReset: (packageKey: string) => void;
}) {
  const [draftAmount, setDraftAmount] = useState(
    override?.amount_cents ? String((override.amount_cents / 100).toFixed(2)) : ""
  );
  const [draftLabel, setDraftLabel] = useState(override?.label || "");

  useEffect(() => {
    setDraftAmount(override?.amount_cents ? String((override.amount_cents / 100).toFixed(2)) : "");
    setDraftLabel(override?.label || "");
  }, [override]);

  return (
    <SpotlightSurface as="article" className="admin-price-card" data-package={packageKey}>
      <div className="admin-price-head">
        <div>
          <p className="admin-kicker">{data?.title || packageKey}</p>
          <strong>{data?.human_price || formatMyr(0)}</strong>
        </div>
        <span className={`badge ${data?.is_promo ? "badge-accent" : "badge-muted"}`}>
          {data?.is_promo ? data.promo_label || "Promo active" : "Default price"}
        </span>
      </div>

      <div className="admin-price-meta">
        <span>Base: {data?.base_human_price || data?.human_price}</span>
        <span>Current: {data?.human_price || data?.base_human_price}</span>
      </div>

      <label>
        Promo price
        <input
          type="number"
          min="0"
          step="0.01"
          value={draftAmount}
          placeholder="Leave blank for default"
          onChange={(event) => setDraftAmount(event.target.value)}
        />
      </label>

      <label>
        Promo label
        <input
          type="text"
          value={draftLabel}
          placeholder="e.g. Promo March"
          onChange={(event) => setDraftLabel(event.target.value)}
        />
      </label>

      <div className="admin-card-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            onSave(
              packageKey,
              draftAmount ? Math.round(Number(draftAmount) * 100) : null,
              draftLabel
            )
          }
        >
          Save promo
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setDraftAmount("");
            setDraftLabel("");
            onReset(packageKey);
          }}
        >
          Reset
        </button>
      </div>
    </SpotlightSurface>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedReference, setSelectedReference] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"info" | "success" | "error">("info");
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const selectedBooking = useMemo(
    () => bookings.find((item) => item.reference === selectedReference) || null,
    [bookings, selectedReference]
  );

  function authHeaders() {
    return adminKey ? { "x-admin-key": adminKey } : {};
  }

  function showStatus(message: string, kind: typeof statusKind = "info") {
    setStatusMessage(message);
    setStatusKind(kind);
  }

  async function api(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    for (const [key, value] of Object.entries(authHeaders())) {
      headers.set(key, value);
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data;
  }

  async function loadDashboard(key = adminKey) {
    if (!key) {
      showStatus("Please enter the admin access key first.", "error");
      return;
    }

    setIsLoading(true);
    try {
      sessionStorage.setItem("sagax-admin-key", key);
      setAdminKey(key);
      const [settingsData, bookingsData] = await Promise.all([
        fetch("/api/admin/settings", { headers: { "x-admin-key": key } }).then((r) => r.json()),
        fetch("/api/admin/bookings", { headers: { "x-admin-key": key } }).then((r) => r.json()),
      ]);

      if (settingsData?.error) throw new Error(settingsData.error);
      if (bookingsData?.error) throw new Error(bookingsData.error);

      setSettings(settingsData.settings);
      setPublicConfig(settingsData.public);
      setBookings(bookingsData.items || []);
      setSelectedReference((current) => current || bookingsData.items?.[0]?.reference || "");
      showStatus("Admin dashboard unlocked.", "success");
    } catch (error) {
      sessionStorage.removeItem("sagax-admin-key");
      setAdminKey("");
      showStatus(error instanceof Error ? error.message : "Unable to unlock admin.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const storedKey = sessionStorage.getItem("sagax-admin-key") || "";
    if (storedKey) {
      setAdminKey(storedKey);
      setDraftKey(storedKey);
      loadDashboard(storedKey).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePricing(packageKey: string, amountCents: number | null, label: string) {
    const current: AdminSettings["package_overrides"] = {
      hour: settings?.package_overrides.hour || null,
      four: settings?.package_overrides.four || null,
      full: settings?.package_overrides.full || null,
    };

    current[packageKey as keyof AdminSettings["package_overrides"]] =
      amountCents && amountCents > 0
        ? {
            amount_cents: Math.round(amountCents),
            label,
            updated_at: new Date().toISOString(),
          }
        : null;

    const data = await api("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_overrides: current }),
    });

    setSettings(data.settings);
    setPublicConfig(data.public);
    showStatus("Promo pricing saved.", "success");
  }

  async function saveBooking(next: Record<string, unknown>) {
    if (!selectedBooking) return;
    const data = await api(`/api/admin/bookings/${encodeURIComponent(selectedBooking.reference)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    const updated = data.booking as Booking;
    setBookings((current) =>
      current.map((item) => (item.reference === updated.reference ? updated : item))
    );
    showStatus(`Booking ${updated.reference} updated.`, "success");
  }

  async function resendBooking() {
    if (!selectedBooking) return;
    await api(`/api/admin/bookings/${encodeURIComponent(selectedBooking.reference)}/resend`, {
      method: "POST",
    });
    showStatus(`Invoice resent to ${selectedBooking.email || "customer"}.`, "success");
  }

  function resetPrice() {
    saveBooking({ reset_price: true }).catch((error) =>
      showStatus(error instanceof Error ? error.message : "Failed to reset price.", "error")
    );
  }

  const activePackages = publicConfig?.packages || {};

  return (
    <div className="page-shell admin-shell">
      <header className={`topbar ${isMenuOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Saga X Ventures</strong>
            <span>Admin control</span>
          </div>
        </div>

        <nav className="topnav" aria-label="Admin primary">
          <a href="#pricing" onClick={() => setIsMenuOpen(false)}>
            Pricing
          </a>
          <a href="#bookings" onClick={() => setIsMenuOpen(false)}>
            Bookings
          </a>
          <a href="#notifications" onClick={() => setIsMenuOpen(false)}>
            Notifications
          </a>
        </nav>

        <div className="topbar-actions">
          <a className="btn btn-ghost" href="/" rel="noreferrer">
            Public site
          </a>
          <button
            type="button"
            className="menu-button"
            aria-expanded={isMenuOpen}
            aria-controls="admin-mobile-nav"
            aria-label="Toggle admin navigation menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span aria-hidden="true" />
          </button>
        </div>

        <div id="admin-mobile-nav" className="mobile-nav-panel" hidden={!isMenuOpen}>
          <a href="#pricing" onClick={() => setIsMenuOpen(false)}>
            Pricing
          </a>
          <a href="#bookings" onClick={() => setIsMenuOpen(false)}>
            Bookings
          </a>
          <a href="#notifications" onClick={() => setIsMenuOpen(false)}>
            Notifications
          </a>
          <a href="/" onClick={() => setIsMenuOpen(false)}>
            Public site
          </a>
        </div>
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

          <SpotlightSurface as="article" className="admin-login">
            <label>
              Admin access key
              <input
                id="admin-key"
                type="password"
                placeholder="Enter ADMIN_ACCESS_KEY"
                autoComplete="current-password"
                value={draftKey}
                onChange={(event) => setDraftKey(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" type="button" onClick={() => loadDashboard(draftKey)}>
                {isLoading ? "Unlocking..." : "Unlock admin"}
              </button>
              <p>Key is stored in session only for this browser tab.</p>
            </div>
          </SpotlightSurface>

          {statusMessage ? (
            <SpotlightSurface as="div" className={`admin-status is-${statusKind}`} id="admin-status">
              {statusMessage}
            </SpotlightSurface>
          ) : null}
        </section>

        <section id="pricing" className="section admin-panel" hidden={!settings}>
          <div className="section-heading">
            <p className="eyebrow">Pricing control</p>
            <h2>Set promo pricing per package.</h2>
            <p>
              Leave a package blank to keep the default price list. Add a promo price only when you want a special offer.
            </p>
          </div>

          <div className="admin-price-grid">
            {packageOrder.map((key) => {
              return (
                <PricingCard
                  key={key}
                  packageKey={key}
                  data={activePackages[key]}
                  override={settings?.package_overrides?.[key] || null}
                  onSave={(packageKey, amountCents, label) =>
                    savePricing(packageKey, amountCents, label).catch((error) =>
                      showStatus(
                        error instanceof Error ? error.message : "Failed to save promo.",
                        "error"
                      )
                    )
                  }
                  onReset={(packageKey) =>
                    savePricing(packageKey, null, "").catch((error) =>
                      showStatus(
                        error instanceof Error ? error.message : "Failed to reset promo.",
                        "error"
                      )
                    )
                  }
                />
              );
            })}
          </div>
        </section>

        <section id="bookings" className="section admin-panel" hidden={!settings}>
          <div className="section-heading">
            <p className="eyebrow">Bookings</p>
            <h2>Review requests and update special cases.</h2>
            <p>
              You can change status, apply a one-off custom amount, add admin notes, or resend the invoice after updates.
            </p>
          </div>

          <div className="admin-booking-layout">
            <div className="admin-bookings-list">
              {bookings.length ? (
                bookings.map((booking) => (
                  <button
                    type="button"
                    className={`admin-booking-item ${selectedReference === booking.reference ? "is-selected" : ""}`}
                    key={booking.reference}
                    onClick={() => setSelectedReference(booking.reference)}
                  >
                    <span className="admin-booking-ref">{booking.reference}</span>
                    <strong>{booking.name || "Unnamed"}</strong>
                    <span>{booking.package_title || ""}</span>
                    <span>
                      {booking.event_date || ""} at {booking.start_time || ""}
                    </span>
                    <span className={`badge ${booking.status === "confirmed" ? "badge-accent" : "badge-muted"}`}>
                      {booking.status || ""}
                    </span>
                    <span>{formatMyr(booking.amount_cents || 0)}</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">No bookings yet.</div>
              )}
            </div>

            <aside className="admin-detail-shell" id="admin-booking-detail">
              {selectedBooking ? (
                <BookingDetail
                  booking={selectedBooking}
                  onSave={saveBooking}
                  onResend={resendBooking}
                  onResetPrice={resetPrice}
                />
              ) : (
                <p className="muted-copy">Select a booking to see full details.</p>
              )}
            </aside>
          </div>
        </section>

        <section id="notifications" className="section admin-panel" hidden={!settings}>
          <div className="section-heading">
            <p className="eyebrow">Notifications</p>
            <h2>WhatsApp alert shortcut ready.</h2>
            <p>
              The system can generate a prefilled WhatsApp alert for <strong>60137732703</strong> so you can message the booking summary fast.
            </p>
          </div>

          <SpotlightSurface as="div" className="notification-card">
            <strong>Tip</strong>
            <p>Click the WhatsApp button inside a booking to open a prefilled alert on mobile or desktop WhatsApp Web.</p>
          </SpotlightSurface>
        </section>
      </main>
    </div>
  );
}

function BookingDetail({
  booking,
  onSave,
  onResend,
  onResetPrice,
}: {
  booking: Booking;
  onSave: (next: Record<string, unknown>) => Promise<void>;
  onResend: () => Promise<void>;
  onResetPrice: () => void;
}) {
  const [status, setStatus] = useState(booking.status || "pending_review");
  const [amount, setAmount] = useState(
    booking.amount_cents ? String((booking.amount_cents / 100).toFixed(2)) : ""
  );
  const [priceLabel, setPriceLabel] = useState(booking.price_label || "");
  const [adminNote, setAdminNote] = useState(String(booking.admin_note || ""));
  const [paymentMethod, setPaymentMethod] = useState(booking.payment_method || "billplz");

  useEffect(() => {
    setStatus(booking.status || "pending_review");
    setAmount(booking.amount_cents ? String((booking.amount_cents / 100).toFixed(2)) : "");
    setPriceLabel(booking.price_label || "");
    setAdminNote(String(booking.admin_note || ""));
    setPaymentMethod(booking.payment_method || "billplz");
  }, [booking]);

  const bookingAmount = formatMyr(booking.amount_cents || 0);

  return (
    <SpotlightSurface as="div" className="admin-detail">
      <div className="admin-detail-head">
        <div>
          <p className="admin-kicker">{booking.reference}</p>
          <h3>{booking.name || "Unnamed booking"}</h3>
          <p className="muted-copy">{booking.package_title || ""}</p>
        </div>
        <span className={`badge ${booking.status === "confirmed" ? "badge-accent" : "badge-muted"}`}>
          {booking.status || ""}
        </span>
      </div>

      <div className="admin-detail-grid">
        <div><span>Package</span><strong>{booking.package_title || ""}</strong></div>
        <div><span>Event date</span><strong>{booking.event_date || ""}</strong></div>
        <div><span>Start time</span><strong>{booking.start_time || ""}</strong></div>
        <div><span>Payment</span><strong>{booking.payment_method || ""}</strong></div>
        <div><span>Amount</span><strong>{bookingAmount}</strong></div>
        <div><span>Base price</span><strong>{formatMyr(Number(booking.base_amount_cents || booking.amount_cents || 0))}</strong></div>
      </div>

      <div className="admin-detail-form">
        <label>
          Booking status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {["pending_payment", "pending_review", "confirmed", "cancelled"].map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Custom amount (RM)
          <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>

        <label>
          Price label
          <input type="text" value={priceLabel} onChange={(event) => setPriceLabel(event.target.value)} placeholder="Promo, special event, etc." />
        </label>

        <label>
          Payment method
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="billplz">Billplz FPX</option>
            <option value="manual">Manual transfer</option>
            <option value="qr">QR payment</option>
          </select>
        </label>

        <label>
          Admin note
          <textarea rows={4} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Internal note" />
        </label>
      </div>

      <div className="admin-card-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            onSave({
              status,
              amount_cents: amount ? Math.round(Number(amount) * 100) : undefined,
              price_label: priceLabel,
              admin_note: adminNote,
              payment_method: paymentMethod,
            }).catch(() => undefined)
          }
        >
          Save booking
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onResend().catch(() => undefined)}>
          Resend invoice
        </button>
        <button type="button" className="btn btn-secondary" onClick={onResetPrice}>
          Reset price
        </button>
        <a
          className="btn btn-secondary"
          href={booking.whatsapp_alert_url || "#"}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!booking.whatsapp_alert_url}
        >
          WhatsApp alert
        </a>
      </div>
    </SpotlightSurface>
  );
}
