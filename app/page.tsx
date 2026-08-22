"use client";

import { FormEvent, useEffect, useState } from "react";

type PackageState = {
  key: string;
  title: string;
  price: string;
  amountCents: number;
  copy: string;
  promoLabel?: string;
  isPromo?: boolean;
};

type PublicConfig = {
  site_name: string;
  company_name: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp: string;
  payment_qr_url: string;
  packages: Record<string, {
    key: string;
    title: string;
    copy: string;
    base_amount_cents: number;
    base_human_price: string;
    amount_cents: number;
    human_price: string;
    promo_label: string;
    is_promo: boolean;
  }>;
};

const defaultPackages: Record<string, PackageState> = {
  hour: {
    title: "Hall 1 Hour",
    price: "RM60.00",
    amountCents: 6000,
    copy: "Best for short meetings or quick sessions.",
  },
  four: {
    title: "Hall 4 Hour",
    price: "RM180.00",
    amountCents: 18000,
    copy: "Best value for workshops, training, and half-day sessions.",
  },
  full: {
    title: "Hall Full Day",
    price: "RM300.00",
    amountCents: 30000,
    copy: "Best value for full-day events and training.",
  },
};

function formatMyr(amountCents = 0) {
  return `RM${(Number(amountCents || 0) / 100).toFixed(2)}`;
}

export default function Home() {
  const [packages, setPackages] = useState<Record<string, PackageState>>(defaultPackages);
  const [selectedPackage, setSelectedPackage] = useState("four");
  const [paymentMethod, setPaymentMethod] = useState("billplz");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<React.ReactNode>(
    "Fill in the form and choose a payment method to create a live booking request."
  );
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/public-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: PublicConfig | null) => {
        if (!mounted || !config?.packages) return;

        const nextPackages: Record<string, PackageState> = {
          hour: {
            ...defaultPackages.hour,
            title: config.packages.hour.title,
            price: config.packages.hour.human_price,
            copy: config.packages.hour.copy,
            promoLabel: config.packages.hour.promo_label,
            isPromo: config.packages.hour.is_promo,
          },
          four: {
            ...defaultPackages.four,
            title: config.packages.four.title,
            price: config.packages.four.human_price,
            copy: config.packages.four.copy,
            promoLabel: config.packages.four.promo_label,
            isPromo: config.packages.four.is_promo,
          },
          full: {
            ...defaultPackages.full,
            title: config.packages.full.title,
            price: config.packages.full.human_price,
            copy: config.packages.full.copy,
            promoLabel: config.packages.full.promo_label,
            isPromo: config.packages.full.is_promo,
          },
        };

        setPackages(nextPackages);
        setPublicConfig(config);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const active = packages[selectedPackage] || packages.four;
  const paymentUrl = "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setBookingResult("Submitting your booking request...");

    try {
      const formData = new FormData(event.currentTarget);
      const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
      payload.pax = Number(payload.pax || 0);
      payload.package = String(payload.package || selectedPackage || "four");
      payload.payment_method = String(payload.payment_method || paymentMethod || "billplz");

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Booking request failed");

      const booking = data.booking || {};
      const nextPaymentUrl = data.payment_url || data.billplz?.paymentUrl || "";
      const emailStatus = data.email?.skipped
        ? "Email is waiting for your Resend API key."
        : "Invoice email sent.";

      setBookingResult(
        <>
          <strong>{booking.reference || "Booking created"}</strong>
          <br />
          Status: {booking.status || "pending"}
          <br />
          {String(payload.payment_method || "Payment")} selected.
          <br />
          {emailStatus}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 12 }}>
            {nextPaymentUrl ? (
              <a className="btn btn-primary" href={nextPaymentUrl} target="_blank" rel="noreferrer">
                Continue to Billplz FPX
              </a>
            ) : null}
          </div>
        </>
      );
    } catch (error) {
      setBookingResult(
        <>
          <strong>Booking could not be created.</strong>
          <br />
          {error instanceof Error ? error.message : "Please check the form and try again."}
        </>
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Saga X Ventures</strong>
            <span>Space booking</span>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary">
          <a href="#pricing">Pricing</a>
          <a href="#gallery">Gallery</a>
          <a href="#payment">Payment</a>
          <a href="#booking">Booking</a>
          <a href="/admin">Admin</a>
        </nav>

        <a className="btn btn-ghost" href="https://wa.me/60137732703" target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Saga X Space, Senawang</p>
            <h1>Book a clean, flexible hall for meetings, classes, and seminars.</h1>
            <p className="lede">
              A practical booking flow for the Saga X hall rental business. Choose a package,
              confirm availability, pay by Billplz FPX or manual transfer, then receive your invoice automatically.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#booking">Book now</a>
              <a className="btn btn-secondary" href="#payment">See payment options</a>
            </div>

            <ul className="trust-row" aria-label="Venue highlights">
              <li>Up to 16 pax seating</li>
              <li>50 pax max chair-only setup</li>
              <li>Free Wi-Fi</li>
              <li>Projector included</li>
              <li>Whiteboard + marker included</li>
            </ul>
          </div>

          <aside className="hero-card">
            <div className="hero-card-top">
              <span className="pill">Fast booking</span>
              <span className="pill pill-muted">Manual review ready</span>
            </div>

            <div className="hero-stat">
              <strong>3</strong>
              <span>packages ready for instant booking</span>
            </div>

            <div className="hero-panel">
              <p className="panel-label">Today&apos;s recommendation</p>
              <h2 id="selected-package-title">{active.title}</h2>
              <p id="selected-package-copy">{active.copy}</p>
              <div className="price-chip" id="selected-package-price">{active.price}</div>

              <div className="feature-grid">
                <div>Wi-Fi</div>
                <div>Projector</div>
                <div>Whiteboard</div>
                <div>Air-cond</div>
              </div>
            </div>
          </aside>
        </section>

        <section id="pricing" className="section">
          <div className="section-heading">
            <p className="eyebrow">Packages</p>
            <h2>Simple pricing that is easy to understand.</h2>
            <p>
              The hall is priced for fast decisions: hourly, half-day, and full-day.
              No complicated matrix, no hidden package maze.
            </p>
          </div>

          <div className="package-grid">
            {(["hour", "four", "full"] as const).map((key) => {
              const data = packages[key];
              return (
                <button
                  className={`package-card ${selectedPackage === key ? "is-active" : ""}`}
                  type="button"
                  key={key}
                  onClick={() => {
                    setSelectedPackage(key);
                    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="package-name">{data.title}</span>
                  <span className="package-price">{data.price}</span>
                  <span className="package-meta">{data.promoLabel || (key === "hour" ? "Hourly" : key === "four" ? "Half Day" : "Full Day")}</span>
                  <span className="package-desc">{data.copy}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="gallery" className="section split-section">
          <div className="section-heading">
            <p className="eyebrow">Venue details</p>
            <h2>Designed for comfortable, productive group sessions.</h2>
            <p>
              The space feels like a clean office-classroom hybrid: tables, chairs, projector,
              whiteboard, air-conditioning, and a layout that works for group learning or meetings.
            </p>

            <ul className="bullet-list">
              <li>Up to 16 pax with table seating</li>
              <li>Up to 50 pax in chair-only layout</li>
              <li>Free Wi-Fi and projector</li>
              <li>Whiteboard and marker ready</li>
              <li>Suitable for office meetings, seminars, and classes</li>
            </ul>
          </div>

          <div className="photo-stack" aria-label="Hall photos">
            <figure className="photo-card photo-card-large">
              <img src="/assets/hall-1.png" alt="Saga X hall setup with tables and chairs" />
              <figcaption>
                <span>Hall image 01</span>
                <strong>Flexible room layout</strong>
              </figcaption>
            </figure>
            <div className="photo-row">
              <figure className="photo-card">
                <img src="/assets/hall-2.png" alt="Saga X hall with projector and seating" />
                <figcaption>
                  <span>Hall image 02</span>
                  <strong>Projector setup</strong>
                </figcaption>
              </figure>
              <figure className="photo-card">
                <img src="/assets/hall-3.png" alt="Saga X hall classroom arrangement" />
                <figcaption>
                  <span>Hall image 03</span>
                  <strong>Meeting tables</strong>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section id="payment" className="section payment-section">
          <div className="section-heading">
            <p className="eyebrow">Payment</p>
            <h2>Use Billplz FPX or keep it manual with bank transfer and QR.</h2>
            <p>
              The booking flow supports both auto payment and manual verification. That means you
              can launch fast now, then tighten automation later if needed.
            </p>
          </div>

          <div className="payment-grid">
            <article className="payment-card">
              <h3>Billplz FPX</h3>
              <p>Best for instant online payment and automatic confirmation.</p>
              <ul>
                <li>Billplz checkout</li>
                <li>Callback verification</li>
                <li>Auto invoice update</li>
              </ul>
            </article>

            <article className="payment-card">
              <h3>Manual transfer</h3>
              <p>Customers can bank transfer directly to Saga X Ventures.</p>
              <ul>
                <li>Hong Leong Bank</li>
                <li>Account: 3440 1065 516</li>
                <li>Proof upload supported</li>
              </ul>
            </article>

            <article className="payment-card">
              <h3>QR payment</h3>
              <p>Show a QR image for quick scan-and-pay on mobile.</p>
              <img className="qr-image" src="/assets/payment-qr.jpg" alt="Saga X Ventures QR payment code" />
              <ul>
                <li>QR image ready</li>
                <li>Resend invoice after booking</li>
                <li>WhatsApp alert to 60137732703</li>
              </ul>
            </article>
          </div>
        </section>

        <section id="booking" className="section booking-section">
          <div className="section-heading">
            <p className="eyebrow">Booking</p>
            <h2>One screen to capture the booking, invoice, and payment intent.</h2>
            <p>
              This is the first-pass booking form. It is intentionally short so the customer can
              reserve the slot without friction.
            </p>
          </div>

          <div className="booking-grid">
            <form className="booking-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>
                  Full name
                  <input type="text" name="name" placeholder="Your name" required />
                </label>
                <label>
                  Email
                  <input type="email" name="email" placeholder="you@example.com" required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  WhatsApp number
                  <input type="tel" name="whatsapp" placeholder="6012 345 6789" />
                </label>
                <label>
                  Event date
                  <input type="date" name="event_date" required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Start time
                  <input type="time" name="start_time" required />
                </label>
                <label>
                  Package
                  <select
                    name="package"
                    id="package-select"
                    value={selectedPackage}
                    onChange={(event) => setSelectedPackage(event.target.value)}
                  >
                    <option value="hour">{packages.hour.title} - {packages.hour.price}</option>
                    <option value="four">{packages.four.title} - {packages.four.price}</option>
                    <option value="full">{packages.full.title} - {packages.full.price}</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Payment method
                  <select
                    name="payment_method"
                    id="payment-method-select"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    <option value="billplz">Billplz FPX</option>
                    <option value="manual">Manual transfer</option>
                    <option value="qr">QR payment</option>
                  </select>
                </label>
                <label>
                  Pax estimate
                  <input type="number" name="pax" min="1" placeholder="16" />
                </label>
              </div>

              <label>
                Event type
                <input type="text" name="event_type" placeholder="Meeting, class, seminar, workshop" />
              </label>

              <label>
                Notes
                <textarea name="notes" rows={4} placeholder="Setup requests, add-ons, or special instructions" />
              </label>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" id="booking-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating booking..." : "Request booking"}
                </button>
                <p>Invoice will be sent by email once the booking is confirmed.</p>
              </div>

              <div className="booking-result" id="booking-result" aria-live="polite">
                {bookingResult}
              </div>
            </form>

            <aside className="summary-card">
              <p className="eyebrow">Current selection</p>
              <h3 id="summary-name">{packages[selectedPackage]?.title || "Hall 4 Hour"}</h3>
              <div className="summary-price" id="summary-price">{packages[selectedPackage]?.price || formatMyr(18000)}</div>
              <p id="summary-copy">{packages[selectedPackage]?.copy}</p>

              <div className="summary-list">
                <div><span>Company</span><strong>Saga X Ventures</strong></div>
                <div><span>Bank</span><strong>{publicConfig?.bank_name || "Hong Leong Bank"}</strong></div>
                <div><span>Account</span><strong>{publicConfig?.bank_account_number || "3440 1065 516"}</strong></div>
                <div><span>WhatsApp</span><strong>{publicConfig?.whatsapp || "60137732703"}</strong></div>
              </div>

              <div className="qr-placeholder">
                <img className="qr-image" src={publicConfig?.payment_qr_url || "/assets/payment-qr.jpg"} alt="Saga X Ventures QR payment code" />
                <span>QR image ready</span>
                <strong>Scan to pay quickly from mobile</strong>
              </div>
            </aside>
          </div>
        </section>

        <section className="section faq-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Keep the common questions in plain sight.</h2>
          </div>

          <div className="faq-grid">
            <article className="faq-card">
              <h3>Is projector included?</h3>
              <p>Yes, projector is included with the hall packages.</p>
            </article>
            <article className="faq-card">
              <h3>Can I pay manually?</h3>
              <p>Yes, bank transfer and QR payment are both supported.</p>
            </article>
            <article className="faq-card">
              <h3>Will I receive an invoice?</h3>
              <p>Yes, invoice emails can be sent through Resend after confirmation.</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Saga X Ventures</strong>
          <p>space.sagaxventures.com</p>
        </div>
        <div className="footer-links">
          <a href="https://wa.me/60137732703" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="mailto:hello@sagaxventures.com">Email</a>
        </div>
      </footer>
    </div>
  );
}
