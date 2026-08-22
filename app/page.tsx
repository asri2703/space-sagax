"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { SpotlightSurface } from "@/components/spotlight-surface";

type PackageState = {
  title: string;
  price: string;
  amountCents: number;
  copy: string;
  isActive?: boolean;
  shortLabel: string;
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
    title: "1 Hour",
    price: "RM60.00",
    amountCents: 6000,
    copy: "Great for quick meetings and short sessions.",
    shortLabel: "Quick session",
  },
  four: {
    title: "4 Hours",
    price: "RM180.00",
    amountCents: 18000,
    copy: "Ideal for classes, workshops and training.",
    shortLabel: "Half-day",
  },
  full: {
    title: "Full Day",
    price: "RM300.00",
    amountCents: 30000,
    copy: "Best for seminars, launches and events.",
    shortLabel: "All day",
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

const paymentCards = [
  {
    title: "Online Banking",
    copy: "Fast online payment for confirmed bookings.",
  },
  {
    title: "Bank Transfer",
    copy: "Manual transfer details appear after booking.",
  },
  {
    title: "QR Payment",
    copy: "Scan the QR when you choose QR payment.",
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

function formatMyr(amountCents = 0) {
  return `RM${(Number(amountCents || 0) / 100).toFixed(2)}`;
}

function scrollToBooking() {
  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BookingInstruction({
  paymentMethod,
  publicConfig,
}: {
  paymentMethod: string;
  publicConfig: PublicConfig | null;
}) {
  const qrUrl = publicConfig?.payment_qr_url || "/assets/payment-qr.png";

  if (paymentMethod === "manual") {
    return (
      <div className="booking-note is-revealed">
        <p className="booking-note-title">Manual transfer details</p>
        <strong>{publicConfig?.bank_name || "Hong Leong Bank"}</strong>
        <span>{publicConfig?.bank_account_name || "Saga X Ventures"}</span>
        <span>{publicConfig?.bank_account_number || "3440 1065 516"}</span>
        <img src={qrUrl} alt="QR payment for Saga X Ventures" className="booking-note-qr" />
        <p>Send the transfer slip after your booking request if needed.</p>
      </div>
    );
  }

  if (paymentMethod === "qr") {
    return (
      <div className="booking-note is-revealed">
        <p className="booking-note-title">QR payment</p>
        <img src={qrUrl} alt="QR payment for Saga X Ventures" className="booking-note-qr" />
        <p>Scan the QR after you submit the booking request.</p>
      </div>
    );
  }

  return (
    <div className="booking-note">
      <p className="booking-note-title">Online banking</p>
      <p>
        Submit your booking request first. We will send the payment step and confirmation by
        email.
      </p>
    </div>
  );
}

export default function Home() {
  const [packages, setPackages] = useState<Record<string, PackageState>>(defaultPackages);
  const [selectedPackage, setSelectedPackage] = useState("four");
  const [paymentMethod, setPaymentMethod] = useState("billplz");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<ReactNode>(
    "Choose a package, complete the form and send your booking request."
  );
  const [publicConfig, setPublicConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/public-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: PublicConfig | null) => {
        if (!mounted || !config?.packages) return;

        setPackages({
          hour: {
            ...defaultPackages.hour,
            price: config.packages.hour.human_price,
            copy: config.packages.hour.copy,
            shortLabel: config.packages.hour.is_promo
              ? config.packages.hour.promo_label || defaultPackages.hour.shortLabel
              : defaultPackages.hour.shortLabel,
            isActive: config.packages.hour.is_promo,
          },
          four: {
            ...defaultPackages.four,
            price: config.packages.four.human_price,
            copy: config.packages.four.copy,
            shortLabel: config.packages.four.is_promo
              ? config.packages.four.promo_label || defaultPackages.four.shortLabel
              : defaultPackages.four.shortLabel,
            isActive: config.packages.four.is_promo,
          },
          full: {
            ...defaultPackages.full,
            price: config.packages.full.human_price,
            copy: config.packages.full.copy,
            shortLabel: config.packages.full.is_promo
              ? config.packages.full.promo_label || defaultPackages.full.shortLabel
              : defaultPackages.full.shortLabel,
            isActive: config.packages.full.is_promo,
          },
        });
        setPublicConfig(config);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const activePackage = packages[selectedPackage] || packages.four;
  const selectedPaymentLabel =
    paymentMethod === "billplz"
      ? "Online Banking"
      : paymentMethod === "manual"
        ? "Bank Transfer"
        : "QR Payment";

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
      const paymentType = String(payload.payment_method || paymentMethod || "billplz");
      const qrUrl = publicConfig?.payment_qr_url || "/assets/payment-qr.png";

      setBookingResult(
        <div className="booking-success">
          <strong>{booking.reference || "Booking created"}</strong>
          <p>
            Your request has been submitted. We will send confirmation and invoice by email.
          </p>
          <div className="booking-success-meta">
            <span>{selectedPaymentLabel}</span>
            <span>{String(booking.status || "pending")}</span>
          </div>
          {paymentType === "billplz" && nextPaymentUrl ? (
            <a className="btn btn-primary" href={nextPaymentUrl} target="_blank" rel="noreferrer">
              Continue to Online Banking
            </a>
          ) : null}
          {paymentType === "manual" ? (
            <div className="booking-success-payment">
              <strong>{publicConfig?.bank_name || "Hong Leong Bank"}</strong>
              <span>{publicConfig?.bank_account_name || "Saga X Ventures"}</span>
              <span>{publicConfig?.bank_account_number || "3440 1065 516"}</span>
              <img src={qrUrl} alt="QR payment for Saga X Ventures" />
            </div>
          ) : null}
          {paymentType === "qr" ? (
            <div className="booking-success-payment">
              <img src={qrUrl} alt="QR payment for Saga X Ventures" />
              <span>Scan the QR to complete payment.</span>
            </div>
          ) : null}
        </div>
      );
    } catch (error) {
      setBookingResult(
        <div className="booking-success is-error">
          <strong>Booking could not be created.</strong>
          <p>{error instanceof Error ? error.message : "Please check the form and try again."}</p>
        </div>
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePackageSelect(key: string) {
    setSelectedPackage(key);
    scrollToBooking();
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Saga X Ventures</strong>
            <span>Saga X Space, Senawang</span>
          </div>
        </div>

        <div className="header-actions">
          <a className="btn btn-ghost" href="https://wa.me/60137732703" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a className="btn btn-primary" href="#booking">
            Book Now
          </a>
        </div>
      </header>

      <main className="site-main">
        <section className="hero-section">
          <SpotlightSurface as="div" className="hero-copy">
            <p className="eyebrow">Saga X Space, Senawang</p>
            <h1>Book Your Space. Simple & Easy.</h1>
            <p className="hero-lede">
              Comfortable space for meetings, classes, workshops and small events in Senawang.
            </p>

            <div className="hero-cta">
              <a className="btn btn-primary" href="#booking">
                Book Now
              </a>
              <a className="btn btn-secondary" href="#pricing">
                View Pricing
              </a>
            </div>

            <ul className="highlight-row" aria-label="Venue highlights">
              {heroHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SpotlightSurface>

          <SpotlightSurface as="figure" className="hero-visual">
            <img src="/assets/hall-1.png" alt="Saga X hall interior with tables and projector" />
            <figcaption>
              <span>Airy hall setup</span>
              <strong>Ready for meetings, classes and workshops</strong>
            </figcaption>
          </SpotlightSurface>
        </section>

        <section id="pricing" className="content-section">
          <div className="section-heading">
            <p className="eyebrow">Pricing</p>
            <h2>Simple, Transparent Pricing</h2>
          </div>

          <div className="pricing-grid">
            {( ["hour", "four", "full"] as const).map((key) => {
              const data = packages[key];
              return (
                <SpotlightSurface
                  as="article"
                  key={key}
                  className={`pricing-card ${selectedPackage === key ? "is-selected" : ""}`}
                >
                  <div className="pricing-card-top">
                    <div>
                      <h3>{data.title}</h3>
                      <p>{data.shortLabel}</p>
                    </div>
                    <strong>{data.price}</strong>
                  </div>
                  <p className="pricing-copy">{data.copy}</p>
                  <button
                    type="button"
                    className="btn btn-primary pricing-button"
                    onClick={() => handlePackageSelect(key)}
                  >
                    Book Now
                  </button>
                </SpotlightSurface>
              );
            })}
          </div>
        </section>

        <section id="venue" className="content-section split-layout">
          <div className="section-copy">
            <p className="eyebrow">Venue</p>
            <h2>A Simple Space for Your Next Session</h2>
            <p className="section-lede">
              Perfect for meetings, training, classes, workshops and small seminars.
            </p>

            <div className="feature-list" aria-label="Venue features">
              {venueFeatures.map((item) => (
                <div key={item} className="feature-item">
                  <span aria-hidden="true" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <SpotlightSurface as="figure" className="venue-image-card">
            <img src="/assets/hall-2.png" alt="Saga X hall with projector and seating arrangement" />
            <figcaption>
              <span>Flexible setup</span>
              <strong>Tables, chairs and projector included</strong>
            </figcaption>
          </SpotlightSurface>
        </section>

        <section id="gallery" className="content-section">
          <div className="section-heading">
            <p className="eyebrow">Gallery</p>
            <h2>Take a Look Inside</h2>
          </div>

          <div className="gallery-grid">
            <SpotlightSurface as="figure" className="gallery-card gallery-card-large">
              <img src="/assets/hall-1.png" alt="Saga X hall with tables" />
            </SpotlightSurface>
            <SpotlightSurface as="figure" className="gallery-card">
              <img src="/assets/hall-2.png" alt="Saga X hall with projector screen" />
            </SpotlightSurface>
            <SpotlightSurface as="figure" className="gallery-card">
              <img src="/assets/hall-3.png" alt="Saga X hall seating layout" />
            </SpotlightSurface>
            <SpotlightSurface as="figure" className="gallery-card">
              <img src="/assets/hall-4.png" alt="Saga X hall interior" />
            </SpotlightSurface>
          </div>
        </section>

        <section id="payment" className="content-section">
          <div className="section-heading">
            <p className="eyebrow">Payment</p>
            <h2>Easy Payment Options</h2>
            <p className="section-lede">
              Pay securely via online banking, bank transfer or QR payment.
            </p>
          </div>

          <div className="payment-grid">
            {paymentCards.map((item) => (
              <SpotlightSurface as="article" key={item.title} className="payment-card">
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </SpotlightSurface>
            ))}
          </div>

          <p className="payment-note">
            Payment details are shown after you submit your booking request or when you select
            manual payment.
          </p>
        </section>

        <section id="booking" className="content-section booking-layout">
          <div className="section-heading">
            <p className="eyebrow">Booking</p>
            <h2>Book Your Space</h2>
            <p className="section-lede">
              Select your date, choose your package and submit your booking request.
            </p>
          </div>

          <div className="booking-grid">
            <SpotlightSurface as="form" className="booking-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Full Name
                  <input type="text" name="name" placeholder="Your name" required />
                </label>
                <label>
                  WhatsApp Number
                  <input type="tel" name="whatsapp" placeholder="6012 345 6789" />
                </label>
                <label>
                  Email
                  <input type="email" name="email" placeholder="you@example.com" required />
                </label>
                <label>
                  Event Date
                  <input type="date" name="event_date" required />
                </label>
                <label>
                  Start Time
                  <input type="time" name="start_time" required />
                </label>
                <label>
                  Package
                  <select
                    name="package"
                    value={selectedPackage}
                    onChange={(event) => setSelectedPackage(event.target.value)}
                  >
                    <option value="hour">{packages.hour.title} - {packages.hour.price}</option>
                    <option value="four">{packages.four.title} - {packages.four.price}</option>
                    <option value="full">{packages.full.title} - {packages.full.price}</option>
                  </select>
                </label>
                <label>
                  Pax
                  <input type="number" name="pax" min="1" placeholder="16" />
                </label>
                <label>
                  Event Type
                  <input type="text" name="event_type" placeholder="Meeting, class, workshop" />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Setup requests, timing notes or anything important"
                />
              </label>

              <label>
                Payment Method
                <select
                  name="payment_method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="billplz">Online Banking</option>
                  <option value="manual">Bank Transfer</option>
                  <option value="qr">QR Payment</option>
                </select>
              </label>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Request Booking"}
                </button>
                <p>Confirmation and invoice will be sent after your booking is confirmed.</p>
              </div>

              <div className="booking-result" aria-live="polite">
                {bookingResult}
              </div>
            </SpotlightSurface>

            <SpotlightSurface as="aside" className="booking-aside">
              <div className="booking-summary">
                <p className="eyebrow">Selected package</p>
                <h3>{activePackage.title}</h3>
                <strong>{activePackage.price}</strong>
                <p>{activePackage.copy}</p>
                <div className="booking-summary-meta">
                  <span>{activePackage.shortLabel}</span>
                  <span>{selectedPaymentLabel}</span>
                </div>
              </div>

              <BookingInstruction paymentMethod={paymentMethod} publicConfig={publicConfig} />
            </SpotlightSurface>
          </div>
        </section>

        <section id="faq" className="content-section">
          <div className="section-heading">
            <p className="eyebrow">FAQ</p>
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="faq-grid">
            {faqItems.map((item) => (
              <SpotlightSurface as="article" key={item.question} className="faq-card">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </SpotlightSurface>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <strong>Saga X Ventures</strong>
          <p>Saga X Space, Senawang</p>
        </div>
        <div className="footer-actions">
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
