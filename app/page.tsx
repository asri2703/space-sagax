// Public landing page at /
//
// Playful Geometric: cream paper, slate ink, candy-coloured accents,
// hard shadows, sticker cards, marquee, confetti, blob-masked hero.

import Link from "next/link";
import { listPublicVenues, listPublicPackages, getPublicSettings } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { formatMyr } from "@/lib/format";
import { Confetti } from "@/components/Confetti";
import { Marquee } from "@/components/Marquee";
import { Squiggle } from "@/components/Squiggle";
import { IconCircle } from "@/components/IconCircle";
import {
  CalendarIcon,
  UsersIcon,
  PartyIcon,
  CheckIcon,
  ShieldIcon,
  BankIcon,
  ChatIcon,
  MapPinIcon,
  ArrowRightIcon,
  ClockIcon,
  SparkleIcon,
} from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [venues, settings] = await Promise.all([listPublicVenues(), getPublicSettings()]);
  const featured = venues[0];
  const packages = featured ? await listPublicPackages(featured.id) : [];
  const popular = packages.find((p) => p.key === "four") || packages[1] || packages[0];

  return (
    <main className="container">
      <header className="site-header">
        <Logo />
        <nav className="site-nav" aria-label="Primary">
          <Link href="#venues">Venues</Link>
          <Link href="#how">How it works</Link>
          <Link href="#packages">Packages</Link>
          <Link href="#contact">Contact</Link>
          <Link href={`/book?venue=${featured?.slug || "saga-x-space"}`} className="is-cta">
            Book a slot
          </Link>
        </nav>
      </header>

      {/* ──────────────── HERO ──────────────── */}
      <section className="hero">
        {/* Big yellow blob behind hero text */}
        <div className="blob-yellow" style={{ width: 520, height: 520, top: -80, left: -120 }} aria-hidden />
        <div className="blob-pink" style={{ width: 220, height: 220, top: 60, right: 40, opacity: 0.3 }} aria-hidden />
        <div className="blob-mint" style={{ width: 180, height: 180, bottom: -40, left: "40%" }} aria-hidden />

        <Confetti variant="hero" />

        <div className="hero-inner">
          <span className="kicker">
            <PartyIcon size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
            Multi-venue hall rental · Senawang
          </span>
          <h1 className="display-1" style={{ marginTop: 20 }}>
            A fun space for your next{" "}
            <span className="accent-violet squiggle">celebration.</span>
          </h1>
          <p className="lead">
            {settings.company_name} — bright, easy-to-book halls in Senawang. Reserve a slot, pay via
            Billplz, and we&apos;ll lock the date for you.
          </p>
          <div className="hero-cta">
            <Link href={`/book?venue=${featured?.slug || "saga-x-space"}`} className="btn btn-primary btn-lg">
              Book a slot
              <span className="btn-icon-circle">
                <ArrowRightIcon size={16} />
              </span>
            </Link>
            <Link href="#venues" className="btn btn-ghost btn-lg">View venues</Link>
          </div>
          <div className="badge-row">
            <span className="badge violet">Billplz</span>
            <span className="badge pink">Lock the date</span>
            <span className="badge mint">Instant confirmation</span>
            <span className="badge cream">Senawang</span>
          </div>
        </div>
      </section>

      {/* ──────────────── MARQUEE ──────────────── */}
      <Marquee
        items={[
          "Billplz payments",
          "Easy booking",
          "Bright halls",
          "Lock the date",
          "No clashing slots",
          "Senawang",
          "Saga X Space",
        ]}
        bg="yellow"
        rotate={-1.5}
      />

      {/* ──────────────── VENUES ──────────────── */}
      <section id="venues" className="section">
        <div style={{ position: "relative" }}>
          <Confetti variant="section" />
          <span className="kicker violet">Our venues</span>
          <h2 className="display-2" style={{ marginTop: 16 }}>Pick your playground</h2>
          <p className="lead">
            Bright, sticker-decorated halls. We&apos;re growing — more halls coming soon.
          </p>
        </div>
        <div className="venue-grid" style={{ marginTop: 32 }}>
          {venues.map((v) => (
            <article key={v.id} className="card card-sticker">
              <span className="card-sticker-tape">★ Featured</span>
              <IconCircle color={v.id === featured?.id ? "violet" : "mint"}>
                <MapPinIcon />
              </IconCircle>
              <h3 className="card-title" style={{ marginTop: 12 }}>{v.name}</h3>
              <p className="card-body">{v.short_description || v.description}</p>
              {v.city && (
                <p className="card-meta">
                  <MapPinIcon size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  {v.city}{v.state ? `, ${v.state}` : ""}
                </p>
              )}
              {v.capacity && (
                <p className="card-meta">
                  <UsersIcon size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  Up to {v.capacity} pax
                </p>
              )}
              <div style={{ marginTop: 16 }}>
                <Link href={`/book?venue=${v.slug}`} className="btn btn-primary btn-block">
                  Book {v.name}
                  <span className="btn-icon-circle">
                    <ArrowRightIcon size={16} />
                  </span>
                </Link>
              </div>
            </article>
          ))}
          {/* "Coming soon" placeholder */}
          <article className="card card-pop" style={{ background: "var(--muted)", borderStyle: "dashed" }}>
            <IconCircle color="yellow">
              <SparkleIcon />
            </IconCircle>
            <h3 className="card-title" style={{ marginTop: 12 }}>Hall #2</h3>
            <p className="card-body">We&apos;re onboarding more halls. Watch this space.</p>
            <span className="badge yellow" style={{ marginTop: 12 }}>Coming soon</span>
          </article>
        </div>
      </section>

      {/* ──────────────── HOW IT WORKS ──────────────── */}
      <section id="how" className="section">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <span className="kicker pink">How it works</span>
          <h2 className="display-2" style={{ marginTop: 16 }}>Three quick steps</h2>
          <Squiggle color="pink" />
        </div>

        <div className="steps" style={{ marginTop: 32 }}>
          <div className="step">
            <span className="step-num">1</span>
            <h3>Pick a date</h3>
            <p>Browse the calendar and pick a slot that&apos;s still open.</p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Send the booking</h3>
            <p>Tell us your name, contact, and which package. Pay via Billplz or bank transfer.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>You&apos;re locked in</h3>
            <p>We confirm the slot and you&apos;re set. We&apos;ll email a copy of your invoice.</p>
          </div>
        </div>
      </section>

      {/* ──────────────── PACKAGES ──────────────── */}
      <section id="packages" className="section">
        <div style={{ position: "relative" }}>
          <span className="kicker mint">Packages</span>
          <h2 className="display-2" style={{ marginTop: 16 }}>Simple, honest pricing</h2>
          <p className="lead">Three slots, all the basics. Pay for the time you need.</p>
        </div>

        <div className="package-grid" style={{ marginTop: 32, alignItems: "center" }}>
          {packages.map((p) => {
            const isPopular = popular && p.id === popular.id;
            return (
              <div key={p.id} className={`card card-pop ${isPopular ? "featured" : ""}`}>
                {isPopular && <span className="featured-badge">Most popular</span>}
                <IconCircle color={isPopular ? "yellow" : p.key === "hour" ? "mint" : "violet"}>
                  {p.key === "hour" ? <ClockIcon /> : p.key === "four" ? <PartyIcon /> : <SparkleIcon />}
                </IconCircle>
                <h3 className="card-title" style={{ marginTop: 12 }}>{p.title}</h3>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, lineHeight: 1, margin: "12px 0 8px", color: "var(--fg)" }}>
                  {formatMyr(p.amount_cents)}
                </p>
                <p className="card-body">{p.description}</p>
                <p className="card-meta">
                  <ClockIcon size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  {Math.round(p.duration_minutes / 60)} hour{Math.round(p.duration_minutes / 60) === 1 ? "" : "s"}
                </p>
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/book?venue=${featured?.slug}&package=${p.key}`}
                    className={`btn ${isPopular ? "btn-primary" : "btn-ghost"} btn-block`}
                  >
                    {isPopular ? "Pick " : "Choose "}{p.title}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────────────── TRUST / FEATURES ──────────────── */}
      <section className="section">
        <div className="feature-grid">
          <div className="card card-sticker">
            <span className="card-sticker-tape mint">Safe</span>
            <IconCircle color="mint"><ShieldIcon /></IconCircle>
            <h3 className="card-title" style={{ marginTop: 12 }}>Lock the date</h3>
            <p className="card-body">Once confirmed, your slot is yours. No double-bookings.</p>
          </div>
          <div className="card card-sticker">
            <span className="card-sticker-tape">Fast</span>
            <IconCircle color="violet"><CheckIcon /></IconCircle>
            <h3 className="card-title" style={{ marginTop: 12 }}>Pay via Billplz</h3>
            <p className="card-body">FPX and card payments. Instant confirmation once paid.</p>
          </div>
          <div className="card card-sticker">
            <span className="card-sticker-tape pink">Easy</span>
            <IconCircle color="pink"><BankIcon /></IconCircle>
            <h3 className="card-title" style={{ marginTop: 12 }}>Or bank transfer</h3>
            <p className="card-body">Prefer manual? Get bank details on the confirmation page.</p>
          </div>
          <div className="card card-sticker">
            <span className="card-sticker-tape violet">Help</span>
            <IconCircle color="violet"><ChatIcon /></IconCircle>
            <h3 className="card-title" style={{ marginTop: 12 }}>WhatsApp support</h3>
            <p className="card-body">Got a question? WhatsApp us anytime. We&apos;re friendly.</p>
          </div>
        </div>
      </section>

      {/* ──────────────── FOOTER ──────────────── */}
      <footer id="contact" className="site-footer">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Logo />
            <p style={{ marginTop: 12, color: "var(--muted-fg)" }}>
              WhatsApp: <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}>{settings.whatsapp}</a>{" "}
              · Email: <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </p>
          </div>
          <div style={{ maxWidth: 320 }}>
            <p className="muted">
              {settings.company_name}. Saga X Space is a trading name under SAGA X.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
