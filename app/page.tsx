"use client";

import { type FormEvent, useEffect, useState, type ReactNode } from "react";
import { SpotlightSurface } from "@/components/spotlight-surface";

type PackageState = {
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
  packages: Record<
    string,
    {
      key: string;
      title: string;
      copy: string;
      base_amount_cents: number;
      base_human_price: string;
      amount_cents: number;
      human_price: string;
      promo_label: string;
      is_promo: boolean;
    }
  >;
};

const defaultPackages: Record<string, PackageState> = {
  hour: {
    title: "Hall 1 Hour",
    price: "RM60.00",
    amountCents: 6000,
    copy: "Best for short meetings, quick sessions, and fast team catch-ups.",
  },
  four: {
    title: "Hall 4 Hour",
    price: "RM180.00",
    amountCents: 18000,
    copy: "Ideal for workshops, training, and half-day sessions with proper setup time.",
  },
  full: {
    title: "Hall Full Day",
    price: "RM300.00",
    amountCents: 30000,
    copy: "Best value for seminars, all-day classes, and event programs.",
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [bookingResult, setBookingResult] = useState<ReactNode>(
    "Choose a package, fill in the form, and we will prepare the invoice."
  );
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    const syncScroll = () => {
      const shift = Math.min(window.scrollY * 0.12, 64);
      document.documentElement.style.setProperty("--scroll-shift", `${shift}px`);
    };

    syncScroll();
    window.addEventListener("scroll", syncScroll, { passive: true });
    return () => window.removeEventListener("scroll", syncScroll);
  }, []);

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
    <div className={`page-shell ${isMenuOpen ? "menu-open" : ""}`}>
      <div className="page-ambient" aria-hidden="true" />

      <header className={`topbar ${isMenuOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Saga X Ventures</strong>
            <span>Space booking</span>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary">
          <a href="#pricing" onClick={() => setIsMenuOpen(false)}>
            Packages
          </a>
          <a href="#gallery" onClick={() => setIsMenuOpen(false)}>
            Venue
          </a>
          <a href="#payment" onClick={() => setIsMenuOpen(false)}>
            Payment
          </a>
          <a href="#booking" onClick={() => setIsMenuOpen(false)}>
            Booking
          </a>
          <a href="/admin" onClick={() => setIsMenuOpen(false)}>
            Admin
          </a>
        </nav>

        <div className="topbar-actions">
          <a className="btn btn-secondary" href="#booking">
            Book now
          </a>
          <a className="btn btn-ghost" href="https://wa.me/60137732703" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <button
            type="button"
            className="menu-button"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-panel"
            aria-label="Toggle navigation menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span aria-hidden="true" />
          </button>
        </div>

        <div id="mobile-nav-panel" className="mobile-nav-panel" hidden={!isMenuOpen}>
          <a href="#pricing" onClick={() => setIsMenuOpen(false)}>
            Packages
          </a>
          <a href="#gallery" onClick={() => setIsMenuOpen(false)}>
            Venue
          </a>
          <a href="#payment" onClick={() => setIsMenuOpen(false)}>
            Payment
          </a>
          <a href="#booking" onClick={() => setIsMenuOpen(false)}>
            Booking
          </a>
          <a href="/admin" onClick={() => setIsMenuOpen(false)}>
            Admin
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <SpotlightSurface as="section" className="hero-copy">
            <p className="eyebrow">Saga X Space, Senawang</p>
            <h1>Reserve the hall with a premium flow that feels effortless.</h1>
            <p className="lede">
              A clean booking experience for Saga X Ventures: live package selection, Billplz FPX,
              manual bank transfer, QR payment, and automatic invoice delivery through Resend.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#booking">
                Start booking
              </a>
              <a className="btn btn-secondary" href="#payment">
                Review payment
              </a>
            </div>

            <ul className="trust-row" aria-label="Venue highlights">
              <li>Up to 16 pax seating</li>
              <li>50 pax chair-only setup</li>
              <li>Free Wi-Fi and projector</li>
              <li>Whiteboard + marker included</li>
              <li>Promo-ready admin pricing</li>
            </ul>
          </SpotlightSurface>

          <SpotlightSurface as="aside" className="hero-card">
            <div className="hero-card-top">
              <span className="pill">Fast booking</span>
              <span className="pill pill-muted">Invoice ready</span>
            </div>

            <div className="hero-visual-media">
              <img src="/assets/hall-1.png" alt="Saga X hall with tables and chairs" />
              <div className="hero-visual-overlay">
                <span className="hero-visual-title">Live room preview</span>
                <div className="hero-visual-stats">
                  <div>
                    <strong>16 pax</strong>
                    <span>Table seating</span>
                  </div>
                  <div>
                    <strong>50 pax</strong>
                    <span>Chair-only max</span>
                  </div>
                  <div>
                    <strong>3 packages</strong>
                    <span>Instant booking</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-stat">
              <strong>{active.price}</strong>
              <span>{active.title}</span>
            </div>

            <div className="hero-panel">
              <p className="panel-label">Featured package</p>
              <h2>{active.title}</h2>
              <p>{active.copy}</p>
              <div className="price-chip">{active.price}</div>

              <div className="feature-grid">
                <div>Wi-Fi</div>
                <div>Projector</div>
                <div>Whiteboard</div>
                <div>Air-conditioned</div>
              </div>
            </div>
          </SpotlightSurface>
        </section>

        <section id="pricing" className="section">
          <div className="section-heading">
            <p className="eyebrow">Packages</p>
            <h2>Clear package pricing with promo overrides when you need them.</h2>
            <p>
              Keep the default price list for quick decisions, then switch on a promo rate from the
              admin area whenever you want to run a special offer.
            </p>
          </div>

          <div className="package-grid">
            {(["hour", "four", "full"] as const).map((key) => {
              const data = packages[key];
              return (
                <SpotlightSurface
                  as="button"
                  key={key}
                  className={`package-card ${selectedPackage === key ? "is-active" : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedPackage(key);
                    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <span className="package-name">{data.title}</span>
                  <span className="package-price">{data.price}</span>
                  <span className="package-meta">
                    {data.promoLabel || (key === "hour" ? "Hourly" : key === "four" ? "Half-day" : "Full-day")}
                  </span>
                  <span className="package-desc">{data.copy}</span>
                </SpotlightSurface>
              );
            })}
          </div>
        </section>

        <section id="gallery" className="section split-section">
          <div className="section-heading">
            <p className="eyebrow">Venue details</p>
            <h2>Designed for productive sessions with a calm, office-like feel.</h2>
            <p>
              The hall works for workshops, small seminars, classes, and team meetings. It stays
              practical, neat, and comfortable so your event feels organized from the start.
            </p>

            <ul className="bullet-list">
              <li>Table seating for up to 16 people</li>
              <li>Chair-only layout for up to 50 people</li>
              <li>Projector, whiteboard, marker, and Wi-Fi included</li>
              <li>Bright, minimal interior with flexible setup</li>
              <li>Easy to pair with invoice and payment workflow</li>
            </ul>
          </div>

          <div className="photo-stack" aria-label="Hall photos">
            <SpotlightSurface as="figure" className="photo-card photo-card-large">
              <img src="/assets/hall-1.png" alt="Saga X hall setup with tables and chairs" />
              <figcaption>
                <span>Hall image 01</span>
                <strong>Flexible room layout</strong>
              </figcaption>
            </SpotlightSurface>
            <div className="photo-row">
              <SpotlightSurface as="figure" className="photo-card">
                <img src="/assets/hall-2.png" alt="Saga X hall with projector and seating" />
                <figcaption>
                  <span>Hall image 02</span>
                  <strong>Projector setup</strong>
                </figcaption>
              </SpotlightSurface>
              <SpotlightSurface as="figure" className="photo-card">
                <img src="/assets/hall-3.png" alt="Saga X hall classroom arrangement" />
                <figcaption>
                  <span>Hall image 03</span>
                  <strong>Meeting tables</strong>
                </figcaption>
              </SpotlightSurface>
            </div>
          </div>
        </section>

        <section id="payment" className="section payment-section">
          <div className="section-heading">
            <p className="eyebrow">Payment</p>
            <h2>Support Billplz FPX, manual transfer, and QR payment in one flow.</h2>
            <p>
              Customers can pay immediately through Billplz, transfer manually to your bank
              account, or scan the QR image you provided for faster checkout.
            </p>
          </div>

          <div className="payment-grid">
            <SpotlightSurface as="article" className="payment-card">
              <h3>Billplz FPX</h3>
              <p>Best for instant payment and automatic confirmation.</p>
              <ul>
                <li>Billplz checkout</li>
                <li>Callback verification</li>
                <li>Auto invoice update</li>
              </ul>
            </SpotlightSurface>

            <SpotlightSurface as="article" className="payment-card">
              <h3>Manual transfer</h3>
              <p>Customers can bank transfer directly to Saga X Ventures.</p>
              <ul>
                <li>{publicConfig?.bank_name || "Hong Leong Bank"}</li>
                <li>Account: {publicConfig?.bank_account_number || "3440 1065 516"}</li>
                <li>Account holder: {publicConfig?.bank_account_name || "SAGA X VENTURES"}</li>
              </ul>
            </SpotlightSurface>

            <SpotlightSurface as="article" className="payment-card">
              <h3>QR payment</h3>
              <p>Show a QR image for quick scan-and-pay on mobile.</p>
              <img
                className="qr-image"
                src={publicConfig?.payment_qr_url || "/assets/payment-qr.png"}
                alt="Saga X Ventures QR payment code"
              />
              <ul>
                <li>QR image ready</li>
                <li>Resend invoice after booking</li>
                <li>WhatsApp alert to {publicConfig?.whatsapp || "60137732703"}</li>
              </ul>
            </SpotlightSurface>
          </div>
        </section>

        <section id="booking" className="section booking-section">
          <div className="section-heading">
            <p className="eyebrow">Booking</p>
            <h2>One screen to capture the booking, invoice, and payment intent.</h2>
            <p>
              The flow stays short on purpose so your customer can reserve the slot quickly without
              a long checkout process.
            </p>
          </div>

          <div className="booking-grid">
            <SpotlightSurface as="form" className="booking-form" onSubmit={handleSubmit}>
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
                    <option value="hour">
                      {packages.hour.title} - {packages.hour.price}
                    </option>
                    <option value="four">
                      {packages.four.title} - {packages.four.price}
                    </option>
                    <option value="full">
                      {packages.full.title} - {packages.full.price}
                    </option>
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
            </SpotlightSurface>

            <SpotlightSurface as="aside" className="summary-card">
              <p className="eyebrow">Current selection</p>
              <h3 id="summary-name">{packages[selectedPackage]?.title || "Hall 4 Hour"}</h3>
              <div className="summary-price" id="summary-price">
                {packages[selectedPackage]?.price || formatMyr(18000)}
              </div>
              <p id="summary-copy">{packages[selectedPackage]?.copy}</p>

              <div className="summary-list">
                <div>
                  <span>Company</span>
                  <strong>{publicConfig?.company_name || "Saga X Ventures"}</strong>
                </div>
                <div>
                  <span>Bank</span>
                  <strong>{publicConfig?.bank_name || "Hong Leong Bank"}</strong>
                </div>
                <div>
                  <span>Account</span>
                  <strong>{publicConfig?.bank_account_number || "3440 1065 516"}</strong>
                </div>
                <div>
                  <span>Account holder</span>
                  <strong>{publicConfig?.bank_account_name || "SAGA X VENTURES"}</strong>
                </div>
                <div>
                  <span>WhatsApp</span>
                  <strong>{publicConfig?.whatsapp || "60137732703"}</strong>
                </div>
              </div>

              <div className="qr-placeholder">
                <img
                  className="qr-image"
                  src={publicConfig?.payment_qr_url || "/assets/payment-qr.png"}
                  alt="Saga X Ventures QR payment code"
                />
                <span>QR image ready</span>
                <strong>Scan to pay quickly from mobile</strong>
              </div>
            </SpotlightSurface>
          </div>
        </section>

        <section className="section faq-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Keep the common questions in plain sight.</h2>
          </div>

          <div className="faq-grid">
            <SpotlightSurface as="article" className="faq-card">
              <h3>Is projector included?</h3>
              <p>Yes, projector is included with the hall packages.</p>
            </SpotlightSurface>
            <SpotlightSurface as="article" className="faq-card">
              <h3>Can I pay manually?</h3>
              <p>Yes, bank transfer and QR payment are both supported.</p>
            </SpotlightSurface>
            <SpotlightSurface as="article" className="faq-card">
              <h3>Will I receive an invoice?</h3>
              <p>Yes, invoice emails can be sent through Resend after confirmation.</p>
            </SpotlightSurface>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Saga X Ventures</strong>
          <p>space.sagaxventures.com</p>
        </div>
        <div className="footer-links">
          <a href="https://wa.me/60137732703" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href="mailto:hello@sagaxventures.com">Email</a>
        </div>
      </footer>
    </div>
  );
}
