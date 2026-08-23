"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

type PackageKey = "hour" | "four" | "full";

type PackageOffer = {
  key: PackageKey;
  title: string;
  copy: string;
  human_price: string;
  amount_cents: number;
  promo_label: string;
  is_promo: boolean;
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

const defaultPackages: Record<PackageKey, PackageOffer> = {
  hour: {
    key: "hour",
    title: "1 Hour",
    copy: "Best for quick meetings and short sessions.",
    human_price: "RM60.00",
    amount_cents: 6000,
    promo_label: "",
    is_promo: false,
  },
  four: {
    key: "four",
    title: "4 Hours",
    copy: "Ideal for classes, workshops and training.",
    human_price: "RM180.00",
    amount_cents: 18000,
    promo_label: "",
    is_promo: false,
  },
  full: {
    key: "full",
    title: "Full Day",
    copy: "Great for seminars and small events.",
    human_price: "RM300.00",
    amount_cents: 30000,
    promo_label: "",
    is_promo: false,
  },
};

const heroHighlights = [
  "Up to 50 Pax",
  "Projector Included",
  "Free Wi-Fi",
  "Air-Conditioned",
];

const venueFeatures = [
  "Up to 16 pax with tables",
  "Up to 50 pax chair-only",
  "Projector included",
  "Whiteboard & marker",
  "Free Wi-Fi",
  "Air-conditioned",
];

const paymentOptions = [
  {
    title: "Online Banking",
    copy: "Pay directly through Billplz after booking.",
  },
  {
    title: "Bank Transfer",
    copy: "Manual transfer details appear when selected.",
  },
  {
    title: "QR Payment",
    copy: "Scan the QR after your booking request.",
  },
];

const faqItems = [
  {
    question: "Is projector included?",
    answer: "Yes, projector is included.",
  },
  {
    question: "How many people can the hall accommodate?",
    answer: "Up to 16 pax with tables or 50 pax for chair-only setup.",
  },
  {
    question: "Can I pay by bank transfer?",
    answer: "Yes, bank transfer and QR payment are available.",
  },
  {
    question: "Will I receive a booking confirmation?",
    answer: "Yes, confirmation and invoice will be sent after your booking is confirmed.",
  },
];

const galleryImages = [
  { src: "/assets/hall-1.png", alt: "Saga X Space hall setup with tables" },
  { src: "/assets/hall-2.png", alt: "Saga X Space presentation setup" },
  { src: "/assets/hall-3.png", alt: "Saga X Space training layout" },
  { src: "/assets/hall-4.png", alt: "Saga X Space spacious hall view" },
];

const packageOrder: PackageKey[] = ["hour", "four", "full"];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="check-icon">
      <path d="M16.5 5.75 8.5 13.75 3.5 8.75" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageKey>("four");
  const [paymentMethod, setPaymentMethod] = useState<"billplz" | "manual" | "qr">("billplz");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ReactNode>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/public-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: PublicConfig | null) => {
        if (!alive || !config?.packages) return;
        setPublicConfig(config);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  const packages = publicConfig?.packages || defaultPackages;
  const selectedOffer = packages[selectedPackage] || defaultPackages[selectedPackage];
  const qrUrl = publicConfig?.payment_qr_url || "/assets/payment-qr.png";
  const bankName = publicConfig?.bank_name || "Hong Leong Bank";
  const bankAccountName = publicConfig?.bank_account_name || "Saga X Ventures";
  const bankAccountNumber = publicConfig?.bank_account_number || "3440 1065 516";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult("Submitting your booking request...");

    try {
      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());
      payload.package = String(payload.package || selectedPackage);
      payload.payment_method = paymentMethod;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Booking request failed");
      }

      const booking = data.booking || {};
      const paymentUrl = String(data.payment_url || data.billplz?.paymentUrl || "");

      setResult(
        <div className="status-card success">
          <p className="status-eyebrow">Booking received</p>
          <h3>{String(booking.reference || "Request submitted")}</h3>
          <p>Your confirmation and invoice will be sent by email.</p>
          <div className="status-grid">
            <span>{String(booking.status || "pending")}</span>
            <span>{selectedOffer.title}</span>
            <span>{paymentMethod === "billplz" ? "Online Banking" : paymentMethod === "manual" ? "Bank Transfer" : "QR Payment"}</span>
          </div>
          {paymentMethod === "billplz" && paymentUrl ? (
            <a className="btn btn-primary" href={paymentUrl} target="_blank" rel="noreferrer">
              Continue to Online Banking
            </a>
          ) : null}
          {paymentMethod !== "billplz" ? (
            <div className="payment-inline">
              <p className="payment-inline-title">Payment details</p>
              <strong>{bankName}</strong>
              <span>{bankAccountName}</span>
              <span>{bankAccountNumber}</span>
              <img src={qrUrl} alt="Saga X Ventures QR payment" />
            </div>
          ) : null}
        </div>
      );
    } catch (error) {
      setResult(
        <div className="status-card error">
          <p className="status-eyebrow">Booking not sent</p>
          <h3>We could not submit the request.</h3>
          <p>{error instanceof Error ? error.message : "Please check the form and try again."}</p>
        </div>
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePackageSelect(key: PackageKey) {
    setSelectedPackage(key);
    scrollToId("booking");
  }

  const selectedPaymentLabel =
    paymentMethod === "billplz"
      ? "Online Banking"
      : paymentMethod === "manual"
        ? "Bank Transfer"
        : "QR Payment";

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            SX
          </span>
          <span>
            <strong>Saga X Ventures</strong>
            <small>Saga X Space, Senawang</small>
          </span>
        </a>

        <nav className="topbar-links" aria-label="Primary">
          <a href="#pricing">Pricing</a>
          <a href="#gallery">Gallery</a>
          <a href="#booking">Booking</a>
          <a className="btn btn-primary" href="#booking">
            Book Now
          </a>
        </nav>
      </header>

      <main id="top" className="page-main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Saga X Space, Senawang</p>
            <h1>Book Your Space. Simple & Easy.</h1>
            <p className="hero-lede">
              Comfortable space for meetings, classes, workshops and small events in Senawang.
            </p>

            <div className="hero-actions">
              <a className="btn btn-primary" href="#booking">
                Book Now
              </a>
              <a className="btn btn-secondary" href="#pricing">
                View Pricing
              </a>
            </div>

            <ul className="hero-highlights" aria-label="Highlights">
              {heroHighlights.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hero-visual">
            <div className="hero-image-card">
              <img src="/assets/hall-1.png" alt="Saga X Space hall setup" />
            </div>
            <div className="hero-metrics">
              <div>
                <strong>50 Pax</strong>
                <span>chair-only setup</span>
              </div>
              <div>
                <strong>Projector</strong>
                <span>included</span>
              </div>
              <div>
                <strong>Wi-Fi</strong>
                <span>free access</span>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="section-head">
            <p className="eyebrow">Pricing</p>
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose a package, then jump straight into booking.</p>
          </div>

          <div className="pricing-grid">
            {packageOrder.map((key) => {
              const offer = packages[key] || defaultPackages[key];
              return (
                <article key={key} className={`pricing-card ${selectedPackage === key ? "is-selected" : ""}`}>
                  {offer.is_promo ? <span className="promo-badge">{offer.promo_label || "Promo"}</span> : null}
                  <h3>{offer.title}</h3>
                  <p>{offer.copy}</p>
                  <strong>{offer.human_price}</strong>
                  <button type="button" className="btn btn-dark" onClick={() => handlePackageSelect(key)}>
                    Book Now
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section venue-section">
          <div className="section-head compact">
            <p className="eyebrow">Venue</p>
            <h2>A Simple Space for Your Next Session</h2>
            <p>Perfect for meetings, training, classes, workshops and small seminars.</p>
          </div>

          <div className="venue-grid">
            <ul className="feature-list">
              {venueFeatures.map((feature) => (
                <li key={feature}>
                  <CheckIcon />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="venue-card">
              <img src="/assets/hall-2.png" alt="Saga X Space hall with presentation screen" />
              <div>
                <strong>Clean, comfortable and ready to book.</strong>
                <p>Everything is arranged to keep your session simple and focused.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="gallery" className="section">
          <div className="section-head compact">
            <p className="eyebrow">Gallery</p>
            <h2>Take a Look Inside</h2>
          </div>

          <div className="gallery-grid">
            {galleryImages.map((image, index) => (
              <figure key={image.src} className={`gallery-card gallery-${index + 1}`}>
                <img src={image.src} alt={image.alt} />
              </figure>
            ))}
          </div>
        </section>

        <section id="booking" className="section booking-section">
          <div className="section-head compact">
            <p className="eyebrow">Booking</p>
            <h2>Book Your Space</h2>
            <p>Select your date, choose your package and submit your booking request.</p>
          </div>

          <div className="booking-grid">
            <form className="booking-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  <span>Full Name</span>
                  <input name="name" type="text" placeholder="Your full name" required />
                </label>
                <label>
                  <span>WhatsApp Number</span>
                  <input name="whatsapp" type="tel" placeholder="60123456789" required />
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" placeholder="you@example.com" required />
                </label>
                <label>
                  <span>Event Date</span>
                  <input name="event_date" type="date" required />
                </label>
                <label>
                  <span>Start Time</span>
                  <input name="start_time" type="time" required />
                </label>
                <label>
                  <span>Pax</span>
                  <input name="pax" type="number" min="1" max="50" placeholder="16" required />
                </label>
                <label className="span-2">
                  <span>Package</span>
                  <select
                    name="package"
                    value={selectedPackage}
                    onChange={(event) => setSelectedPackage(event.target.value as PackageKey)}
                  >
                    <option value="hour">1 Hour - {packages.hour?.human_price || defaultPackages.hour.human_price}</option>
                    <option value="four">4 Hours - {packages.four?.human_price || defaultPackages.four.human_price}</option>
                    <option value="full">Full Day - {packages.full?.human_price || defaultPackages.full.human_price}</option>
                  </select>
                </label>
                <label className="span-2">
                  <span>Event Type</span>
                  <input name="event_type" type="text" placeholder="Meeting, class, workshop..." required />
                </label>
                <label className="span-2">
                  <span>Notes</span>
                  <textarea name="notes" rows={4} placeholder="Any special request or extra note." />
                </label>
              </div>

              <fieldset className="payment-choice">
                <legend>Payment</legend>
                <label className={paymentMethod === "billplz" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="billplz"
                    checked={paymentMethod === "billplz"}
                    onChange={() => setPaymentMethod("billplz")}
                  />
                  <span>
                    <strong>Online Banking</strong>
                    <small>Billplz FPX</small>
                  </span>
                </label>
                <label className={paymentMethod === "manual" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="manual"
                    checked={paymentMethod === "manual"}
                    onChange={() => setPaymentMethod("manual")}
                  />
                  <span>
                    <strong>Bank Transfer</strong>
                    <small>Manual transfer</small>
                  </span>
                </label>
                <label className={paymentMethod === "qr" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="qr"
                    checked={paymentMethod === "qr"}
                    onChange={() => setPaymentMethod("qr")}
                  />
                  <span>
                    <strong>QR Payment</strong>
                    <small>Scan to pay</small>
                  </span>
                </label>
              </fieldset>

              <button className="btn btn-primary btn-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Request Booking"}
              </button>
            </form>

            <aside className="booking-aside">
              <div className="summary-card">
                <p className="status-eyebrow">Your selection</p>
                <h3>{selectedOffer.title}</h3>
                <strong>{selectedOffer.human_price}</strong>
                <p>{selectedOffer.copy}</p>
                <div className="summary-meta">
                  <span>{selectedPaymentLabel}</span>
                  <span>Up to 50 pax</span>
                </div>
              </div>

              {paymentMethod !== "billplz" ? (
                <div className="payment-inline">
                  <p className="payment-inline-title">Payment details</p>
                  <strong>{bankName}</strong>
                  <span>{bankAccountName}</span>
                  <span>{bankAccountNumber}</span>
                  <img src={qrUrl} alt="Saga X Ventures QR payment" />
                </div>
              ) : (
                <div className="payment-note">
                  <p className="payment-inline-title">Payment notes</p>
                  <p>Submit the booking first. We will guide the customer to Billplz for online banking after the request is received.</p>
                </div>
              )}

              {result ? result : null}
            </aside>
          </div>
        </section>

        <section id="payment" className="section">
          <div className="section-head compact">
            <p className="eyebrow">Payment</p>
            <h2>Easy Payment Options</h2>
            <p>Pay securely via online banking, bank transfer or QR payment.</p>
          </div>

          <div className="payment-grid">
            {paymentOptions.map((item) => (
              <article key={item.title} className="info-card">
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="section faq-section">
          <div className="section-head compact">
            <p className="eyebrow">FAQ</p>
            <h2>Common Questions</h2>
          </div>

          <div className="faq-list">
            {faqItems.map((item) => (
              <details key={item.question} className="faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Saga X Ventures</strong>
          <p>Saga X Space, Senawang</p>
        </div>

        <div className="footer-links">
          <a href="https://wa.me/60137732703" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href="mailto:hello@sagaxventures.com">Email</a>
          <a className="btn btn-primary" href="#booking">
            Book Now
          </a>
        </div>
      </footer>
    </div>
  );
}
