"use client";

import { useEffect, useState, useCallback } from "react";
import "./admin.css";

// Decorative SVG shapes (aria-hidden) sprinkled behind the hero.
function HeroDecorations() {
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="160"
      viewBox="0 0 1200 160"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
    >
      <circle cx="120" cy="40" r="14" fill="#FBBF24" stroke="#1E293B" strokeWidth="2" />
      <circle cx="220" cy="100" r="8" fill="#34D399" stroke="#1E293B" strokeWidth="2" />
      <path d="M 320 60 q 12 -14 24 0 t 24 0 t 24 0" fill="none" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
      <rect x="420" y="30" width="22" height="22" fill="#8B5CF6" stroke="#1E293B" strokeWidth="2" transform="rotate(20 431 41)" />
      <path d="M 540 90 l 14 -16 l 14 16 l -14 16 z" fill="#FBBF24" stroke="#1E293B" strokeWidth="2" />
      <circle cx="700" cy="50" r="10" fill="#F472B6" stroke="#1E293B" strokeWidth="2" />
      <path d="M 820 80 q 14 -16 28 0 t 28 0" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
      <circle cx="980" cy="60" r="6" fill="#8B5CF6" stroke="#1E293B" strokeWidth="2" />
      <rect x="1080" y="40" width="18" height="18" fill="#34D399" stroke="#1E293B" strokeWidth="2" transform="rotate(-15 1089 49)" />
    </svg>
  );
}

// A floating yellow star badge ("MOST POPULAR") for the middle pricing card.
function PopularStarBadge() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "-18px",
        right: "-18px",
        width: "96px",
        height: "96px",
        transform: "rotate(15deg)",
        pointerEvents: "none",
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <polygon
          points="50,5 61,38 95,38 67,58 78,90 50,70 22,90 33,58 5,38 39,38"
          fill="#FBBF24"
          stroke="#1E293B"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fontSize="9"
          fontWeight="800"
          fill="#1E293B"
          fontFamily="Outfit, system-ui, sans-serif"
          letterSpacing="0.4"
        >
          MOST
        </text>
        <text
          x="50"
          y="60"
          textAnchor="middle"
          fontSize="9"
          fontWeight="800"
          fill="#1E293B"
          fontFamily="Outfit, system-ui, sans-serif"
          letterSpacing="0.4"
        >
          POPULAR
        </text>
      </svg>
    </div>
  );
}

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
  payment_url?: string;
  event_type?: string;
  notes?: string;
  admin_note?: string;
  price_label?: string;
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
      // Also set a cookie so the printable invoice page at /invoice/[ref]
      // can authenticate without needing the key in the URL (which some
      // browser extensions and link shorteners strip).
      if (typeof document !== "undefined") {
        const oneWeek = 7 * 24 * 60 * 60;
        document.cookie = `admin_key=${encodeURIComponent(tempKey)}; path=/; max-age=${oneWeek}; SameSite=Lax`;
      }
    } catch (e) {
      setUnlocked(false);
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Login failed." });
      sessionStorage.removeItem("sagax-admin-key");
      if (typeof document !== "undefined") {
        document.cookie = "admin_key=; path=/; max-age=0";
      }
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
    if (typeof document !== "undefined") {
      document.cookie = "admin_key=; path=/; max-age=0";
    }
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

    // Local form state for the custom invoice fields. Initialised from the
    // selected booking and kept in sync when the user picks a different one.
    const [customAmount, setCustomAmount] = useState<string>("");
    const [priceLabel, setPriceLabel] = useState<string>("");
    const [adminNote, setAdminNote] = useState<string>("");
    const [savingBooking, setSavingBooking] = useState<boolean>(false);
    const [resending, setResending] = useState<boolean>(false);
    const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
    const [resettingPrice, setResettingPrice] = useState<boolean>(false);
    const [previewEmail, setPreviewEmail] = useState<boolean>(false);

    // Status / lock-date controls. We track a draft so the dropdown reflects
    // the optimistic value while the PATCH is in flight, and snap back to
    // the server-side value on the next bookings refresh.
    const [statusDraft, setStatusDraft] = useState<string>("");
    const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    // Sync local form state whenever the selected booking changes.
    useEffect(() => {
      if (selectedBooking) {
        setCustomAmount(((selectedBooking.amount_cents || 0) / 100).toFixed(2));
        setPriceLabel(selectedBooking.price_label || "");
        setAdminNote(selectedBooking.admin_note || "");
        setStatusDraft(selectedBooking.status || "");
        setStatusError(null);
      } else {
        setCustomAmount("");
        setPriceLabel("");
        setAdminNote("");
        setStatusDraft("");
        setStatusError(null);
      }
    }, [selectedReference, selectedBooking?.reference]);

    async function setBookingStatus(reference: string, nextStatus: string) {
      if (!reference || !nextStatus) return;
      setUpdatingStatus(true);
      setStatusError(null);
      try {
        const data = await api(
          `/api/admin/bookings/${encodeURIComponent(reference)}`,
          { method: "PATCH", body: JSON.stringify({ status: nextStatus }) }
        );
        const updated: Booking = data.booking;
        setBookings((prev) => prev.map((b) => (b.reference === reference ? updated : b)));
        setStatusDraft(updated.status || "");
        setStatus({
          kind: "success",
          text:
            nextStatus === "confirmed"
              ? `Booking ${reference} confirmed — date is locked.`
              : nextStatus === "cancelled"
              ? `Booking ${reference} cancelled — date is released.`
              : `Booking ${reference} set to ${nextStatus}.`,
        });
      } catch (e) {
        setStatusError(e instanceof Error ? e.message : "Status update failed.");
      } finally {
        setUpdatingStatus(false);
      }
    }

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

    async function saveCustomInvoice(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!selectedBooking) return;
      const amount = Number(customAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setStatus({ kind: "error", text: "Please enter a valid amount greater than 0." });
        return;
      }
      setSavingBooking(true);
      try {
        await patchBooking(selectedBooking.reference, {
          amount_cents: Math.round(amount * 100),
          price_label: priceLabel.trim() || "Custom price",
          admin_note: adminNote.trim() || undefined,
        });
      } finally {
        setSavingBooking(false);
      }
    }

    async function resetCustomPrice() {
      if (!selectedBooking) return;
      setResettingPrice(true);
      try {
        await patchBooking(selectedBooking.reference, {
          reset_price: true,
          price_label: "Default price",
        });
      } finally {
        setResettingPrice(false);
      }
    }

    async function resendBookingWithCustomInvoice() {
        if (!selectedBooking) return;
        setResending(true);
        try {
          const data = await api(
            `/api/admin/bookings/${encodeURIComponent(selectedBooking.reference)}/resend`,
            { method: "POST" },
          );
          const result = data?.email ? ` (${data.email.error ? `email failed: ${data.email.error}` : "email sent"})` : "";
          setStatus({ kind: "success", text: `Invoice email resent for ${selectedBooking.reference}${result}.` });
        } catch (e) {
          setStatus({ kind: "error", text: e instanceof Error ? e.message : "Resend failed." });
        } finally {
          setResending(false);
        }
      }

    async function copyAlertText() {
      if (!selectedBooking) return;
      const text = buildWhatsappText(selectedBooking);
      try {
        await navigator.clipboard.writeText(text);
        setStatus({ kind: "success", text: "Alert text copied to clipboard." });
      } catch {
        // Fallback: select-and-copy approach using a temp textarea
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ kind: "success", text: "Alert text copied to clipboard." });
        } catch {
          setStatus({ kind: "error", text: "Could not copy to clipboard. Select the text manually." });
        }
      }
    }

    function buildWhatsappText(booking: Booking): string {
      return [
        `Saga X Space booking ${booking.reference}`,
        `Name: ${booking.name || "?"}`,
        `Email: ${booking.email || "?"}`,
        `Date: ${booking.event_date || "?"} at ${booking.start_time || "?"}`,
        `Package: ${booking.package_title || "?"}`,
        `Amount: ${formatMyr(booking.amount_cents || 0)}${booking.price_label ? ` (${booking.price_label})` : ""}`,
        `Status: ${booking.status || "?"}`,
        booking.admin_note ? `Note: ${booking.admin_note}` : "",
      ].filter(Boolean).join("\n");
    }

    function buildWhatsappUrl(booking: Booking): string {
      const text = buildWhatsappText(booking);
      const phone = publicConfig?.whatsapp || "60137732703";
      return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    }

    function buildInvoiceUrl(booking: Booking): string {
      // PDF endpoint. Returns the URL the admin client fetches to download
      // the generated PDF. Auth is via the `admin_key` cookie set on
      // login (or the x-admin-key header) so the URL itself is clean.
      return `/api/admin/invoice/${encodeURIComponent(booking.reference)}/pdf`;
    }

    async function downloadInvoicePdf(booking: Booking) {
      if (!booking?.reference) return;
      setDownloadingPdf(true);
      try {
        console.log("[admin] downloadInvoicePdf start", booking.reference);
        const response = await fetch(
          `/api/admin/invoice/${encodeURIComponent(booking.reference)}/pdf`,
          {
            credentials: "include",
            headers: { "x-admin-key": adminKey || "" },
          }
        );
        console.log("[admin] PDF response", response.status, response.statusText);
        if (!response.ok) {
          let message = `Download failed (${response.status})`;
          try {
            const data = await response.json();
            if (data?.error) message = data.error;
            if (data?.stage) message += ` [${data.stage}]`;
          } catch {
            // not JSON
          }
          throw new Error(message);
        }
        const blob = await response.blob();
        console.log("[admin] PDF blob", blob.size, "bytes, type=", blob.type);
        if (blob.size === 0) {
          throw new Error("Server returned an empty PDF.");
        }
        if (!blob.type.includes("pdf")) {
          throw new Error(`Server returned ${blob.type || "unknown"}, expected PDF.`);
        }
        // Try the programmatic download first; on mobile Safari and
        // some hardened browsers the synthetic <a>.click() is a no-op,
        // so fall back to opening the blob in a new tab.
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `invoice-${booking.reference}.pdf`;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Give the browser a moment to honour the download, then check
        // whether the user agent is one that swallows synthetic clicks.
        setTimeout(() => {
          // If the user is still on the admin page (i.e. the click
          // didn't navigate away or trigger a download bar), the
          // browser likely ignored the synthetic anchor. Open in a
          // new tab as a fallback.
          if (typeof document !== "undefined" && document.visibilityState === "visible") {
            window.open(blobUrl, "_blank", "noopener,noreferrer");
          }
          setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        }, 300);
        setStatus({
          kind: "success",
          text: `Invoice ${booking.reference} downloaded.`,
        });
      } catch (e) {
        console.error("[admin] downloadInvoicePdf error", e);
        setStatus({
          kind: "error",
          text: e instanceof Error ? e.message : "Could not download invoice.",
        });
      } finally {
        setDownloadingPdf(false);
      }
    }

    // Render the live email preview that will be sent. Mirrors what
    // bookingEmailHtml produces on the backend.
    function renderEmailPreview(booking: Booking): { subject: string; body: string } {
      const subject = `${publicConfig?.site_name || "Saga X Space"} booking invoice ${booking.reference}`;
      const lines = [
        `Hi ${booking.name || "there"},`,
        "",
        `Thank you for booking ${publicConfig?.site_name || "Saga X Space"}. Here are your booking details:`,
        "",
        `  Reference : ${booking.reference}`,
        `  Event date: ${booking.event_date || "?"}`,
        `  Start time: ${booking.start_time || "?"}`,
        `  Package   : ${booking.package_title || "?"}`,
        `  Amount    : ${formatMyr(booking.amount_cents || 0)}${booking.price_label ? ` (${booking.price_label})` : ""}`,
        "",
        booking.payment_method === "billplz" && booking.payment_url
          ? `Pay online: ${booking.payment_url}`
          : `Pay via bank transfer to ${publicConfig?.bank_name || "Hong Leong Bank"} — ${publicConfig?.bank_account_name || "Saga X Ventures"} (${publicConfig?.bank_account_number || "3440 1065 516"}).`,
        "",
        `If you have any questions, reply to this email or message us on WhatsApp.`,
        "",
        `${publicConfig?.company_name || "Saga X Ventures"}`,
      ];
      return { subject, body: lines.join("\n") };
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
        <section className="section admin-hero" style={{ position: "relative" }}>
                  <HeroDecorations />
                  <div className="section-heading" style={{ position: "relative", zIndex: 1 }}>
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
                                    const isFeatured = key === "four";
                                    return (
                                      <article
                                        key={key}
                                        className="admin-price-card"
                                        style={isFeatured ? { position: "relative" } : undefined}
                                      >
                                        {isFeatured && <PopularStarBadge />}
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

                      {/* Row 1 — Status / lock date */}
                      <div className="admin-detail-row" data-row="status">
                        <p className="admin-kicker">Status</p>
                        <div className="admin-status-row" role="group" aria-label="Booking status">
                          <label className="admin-status-label">
                            <span className="visually-hidden">Status</span>
                            <select
                              value={statusDraft}
                              onChange={(e) => setStatusDraft(e.target.value)}
                              disabled={updatingStatus}
                            >
                              <option value="pending_payment">pending_payment</option>
                              <option value="pending_review">pending_review</option>
                              <option value="confirmed">confirmed</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          </label>
                          <div className="admin-status-actions">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => setBookingStatus(selectedBooking.reference, statusDraft)}
                              disabled={updatingStatus || statusDraft === (selectedBooking.status || "")}
                              title="Save the selected status and lock / release the date accordingly"
                            >
                              {updatingStatus ? "Saving…" : "Save status"}
                            </button>
                            {selectedBooking.status !== "confirmed" && (
                              <button
                                type="button"
                                className="btn btn-confirm"
                                onClick={() => setBookingStatus(selectedBooking.reference, "confirmed")}
                                disabled={updatingStatus}
                                title="Mark the booking as paid and lock the date so it shows as fully booked"
                              >
                                Confirm &amp; lock date
                              </button>
                            )}
                            {selectedBooking.status !== "cancelled" && (
                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => {
                                  if (typeof window !== "undefined" && window.confirm("Cancel this booking and release the date?")) {
                                    setBookingStatus(selectedBooking.reference, "cancelled");
                                  }
                                }}
                                disabled={updatingStatus}
                                title="Cancel the booking and release the date for other clients"
                              >
                                Cancel booking
                              </button>
                            )}
                          </div>
                          {statusError && (
                            <p className="admin-status-error" role="alert">
                              {statusError}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Row 2 — Custom invoice form */}
                      <form className="admin-detail-row admin-invoice-form" data-row="invoice" onSubmit={saveCustomInvoice}>
                        <p className="admin-kicker">Custom invoice</p>
                        <p className="muted-copy">
                          Override the default amount, add a label, and write an internal note for this client.
                        </p>
                        <div className="admin-invoice-grid">
                          <label>
                            Custom amount (MYR)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={customAmount}
                              onChange={(e) => setCustomAmount(e.target.value)}
                              placeholder="e.g. 120.00"
                            />
                          </label>
                          <label>
                            Price label
                            <input
                              type="text"
                              value={priceLabel}
                              onChange={(e) => setPriceLabel(e.target.value)}
                              placeholder="Promo, special event, etc."
                            />
                          </label>
                          <label className="admin-invoice-note">
                            Admin note (internal)
                            <textarea
                              rows={3}
                              value={adminNote}
                              onChange={(e) => setAdminNote(e.target.value)}
                              placeholder="Internal note — not sent to the client"
                            />
                          </label>
                        </div>
                        <div className="admin-detail-actions">
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={savingBooking}
                          >
                            {savingBooking ? "Saving…" : "Save invoice"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={resetCustomPrice}
                            disabled={resettingPrice}
                          >
                            {resettingPrice ? "Resetting…" : "Reset to default price"}
                          </button>
                        </div>
                        {previewEmail && (() => {
                          // Use the live values from the form, so the preview
                          // reflects what the client will see *after* save.
                          const liveBooking = {
                            ...selectedBooking,
                            amount_cents: Number.isFinite(Number(customAmount))
                              ? Math.round(Number(customAmount) * 100)
                              : selectedBooking.amount_cents,
                            price_label: priceLabel,
                          };
                          const preview = renderEmailPreview(liveBooking);
                          return (
                            <div className="admin-email-preview" aria-live="polite">
                              <p className="admin-kicker">Email preview</p>
                              <p className="admin-email-subject"><strong>Subject:</strong> {preview.subject}</p>
                              <pre className="admin-email-body">{preview.body}</pre>
                            </div>
                          );
                        })()}
                      </form>

                      {/* Row 3 — Send & share */}
                      <div className="admin-detail-row" data-row="share">
                        <p className="admin-kicker">Send &amp; share</p>
                        <div className="admin-detail-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => downloadInvoicePdf(selectedBooking)}
                            disabled={downloadingPdf}
                            title="Download a PDF invoice for this booking — ready to forward to the client"
                          >
                            {downloadingPdf ? "Generating PDF…" : "Download invoice"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={resendBookingWithCustomInvoice}
                            disabled={resending}
                          >
                            {resending ? "Sending…" : "Resend invoice to client"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setPreviewEmail((v) => !v)}
                          >
                            {previewEmail ? "Hide email preview" : "Preview email"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={copyAlertText}
                          >
                            Copy alert text
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