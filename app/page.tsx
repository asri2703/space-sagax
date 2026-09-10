// Public site: landing page at /
//   Lists active venues (initially just Saga X Space) with a CTA
//   to /book. Playful Geometric vibe — cream, slate, candy accents.

import Link from "next/link";
import { listPublicVenues, listPublicPackages, getPublicSettings } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { formatMyr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [venues, settings] = await Promise.all([listPublicVenues(), getPublicSettings()]);
  const featured = venues[0];
  const packages = featured ? await listPublicPackages(featured.id) : [];

  return (
    <main className="container">
      <header className="site-header">
        <Logo />
        <nav className="site-nav">
          <Link href="/#venues">Venues</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#contact">Contact</Link>
          <Link href="/book" className="btn btn-primary btn-pill">Book now</Link>
        </nav>
      </header>

      <section className="hero">
        <span className="kicker">Multi-venue hall rental · Senawang</span>
        <h1 className="display-1">A fun space for your next <span className="accent-violet">celebration</span>.</h1>
        <p className="lead">
          {settings.company_name} — bright, easy-to-book halls in Senawang. Reserve a slot, pay via Billplz,
          and we&apos;ll lock the date for you.
        </p>
        <div className="hero-cta">
          <Link href={`/book?venue=${featured?.slug || "saga-x-space"}`} className="btn btn-primary btn-lg">Book a slot</Link>
          <Link href="#venues" className="btn btn-ghost btn-lg">View venues</Link>
        </div>
        <div className="badge-row">
          <span className="badge badge-violet">Billplz</span>
          <span className="badge badge-pink">Free cancellation*</span>
          <span className="badge badge-mint">Instant confirmation</span>
        </div>
      </section>

      <section id="venues" className="section">
        <h2 className="display-2">Our venues</h2>
        <div className="venue-grid">
          {venues.map((v) => (
            <article key={v.id} className="card card-sticker">
              <div className="card-sticker-tape">★ featured</div>
              <h3 className="card-title">{v.name}</h3>
              <p className="card-body">{v.short_description || v.description}</p>
              {v.city && <p className="card-meta">{v.city}{v.state ? `, ${v.state}` : ""}</p>}
              {v.capacity && <p className="card-meta">Up to {v.capacity} pax</p>}
              <Link href={`/book?venue=${v.slug}`} className="btn btn-primary btn-block">Book {v.name}</Link>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="section">
        <h2 className="display-2">How it works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Pick a date</h3>
            <p>Browse the calendar and pick a slot that&apos;s still open.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Send the booking</h3>
            <p>Tell us your name, contact, and which package. Pay via Billplz or bank transfer.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>You&apos;re locked in</h3>
            <p>We confirm the slot and you&apos;re set. We&apos;ll email a copy of your invoice.</p>
          </div>
        </div>
      </section>

      {featured && packages.length > 0 && (
        <section className="section">
          <h2 className="display-2">Packages</h2>
          <div className="package-grid">
            {packages.map((p) => (
              <div key={p.id} className="card card-pop">
                <h3 className="card-title">{p.title}</h3>
                <p className="price">{formatMyr(p.amount_cents)}</p>
                <p className="card-body">{p.description}</p>
                <p className="card-meta">{Math.round(p.duration_minutes / 60 * 10) / 10} hours</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer id="contact" className="site-footer">
        <Logo />
        <p>
          WhatsApp: <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}>{settings.whatsapp}</a> ·
          Email: <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </p>
        <p className="muted">
          {settings.company_name}. Saga X Space is a trading name under SAGA X.
        </p>
      </footer>
    </main>
  );
}
