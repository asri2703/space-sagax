// Public booking page at /book
//
// Playful Geometric: cream paper, sticker cards, animated stepper,
// calendar dengan hard shadows, package options dengan icon circles.

import { listPublicVenues, listPublicPackages, getMonthAvailability } from "@/lib/data";
import { getPublicSettings } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { BookingFlow } from "./_client";
import { notFound } from "next/navigation";
import { formatMyr } from "@/lib/format";
import { Confetti } from "@/components/Confetti";
import { Squiggle } from "@/components/Squiggle";
import { IconCircle } from "@/components/IconCircle";
import { CalendarIcon, ClockIcon, PartyIcon, SparkleIcon, ArrowRightIcon } from "@/components/Icons";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = { venue?: string; package?: string };

export default async function BookPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;
  const slug = sp.venue || "saga-x-space";

  const venues = await listPublicVenues();
  const venue = venues.find((v) => v.slug === slug);
  if (!venue) {
    return notFound();
  }
  const [packages, settings] = await Promise.all([
    listPublicPackages(venue.id),
    getPublicSettings(),
  ]);

  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const initialAvailability = await getMonthAvailability(venue.id, initialMonth);

  return (
    <main className="container">
      <header className="site-header">
        <Logo />
        <Link href="/" className="btn btn-ghost btn-sm">← Back home</Link>
      </header>

      {/* ─── HERO BAND ─── */}
      <section style={{ position: "relative", padding: "48px 0 32px" }}>
        <div className="blob-yellow" style={{ width: 320, height: 320, top: -80, right: -80, opacity: 0.4 }} aria-hidden />
        <Confetti variant="sparse" />
        <span className="kicker mint">
          <CalendarIcon size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 6 }} />
          {venue.city || "Senawang"}
        </span>
        <h1 className="display-1" style={{ marginTop: 16 }}>Book {venue.name}</h1>
        {venue.short_description && <p className="lead">{venue.short_description}</p>}
        <Squiggle color="violet" />
      </section>

      {/* ─── BOOKING FLOW ─── */}
      <section style={{ marginBottom: 64 }}>
        <BookingFlow
          venue={venue}
          packages={packages}
          initialAvailability={initialAvailability}
          initialMonth={initialMonth}
          initialPackage={sp.package || null}
          settings={{
            company_name: settings.company_name,
            whatsapp: settings.whatsapp,
            email: settings.email,
            bank_name: settings.bank_name,
            bank_account_number: settings.bank_account_number,
            bank_account_name: settings.bank_account_name,
          }}
        />
      </section>

      {/* ─── PACKAGES (for reference) ─── */}
      <section className="section">
        <span className="kicker yellow">Packages</span>
        <h2 className="display-2" style={{ marginTop: 16 }}>Pick a slot length</h2>

        <div className="package-grid" style={{ marginTop: 32 }}>
          {packages.map((p, i) => {
            const accent = i === 0 ? "mint" : i === 1 ? "violet" : "pink";
            const icon = p.key === "hour" ? <ClockIcon /> : p.key === "four" ? <PartyIcon /> : <SparkleIcon />;
            return (
              <div key={p.id} className="card card-sticker">
                <span className={`card-sticker-tape ${accent}`}>{p.title}</span>
                <IconCircle color={accent as never}>{icon}</IconCircle>
                <h3 className="card-title" style={{ marginTop: 12 }}>{p.title}</h3>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, lineHeight: 1, margin: "12px 0 8px" }}>
                  {formatMyr(p.amount_cents)}
                </p>
                <p className="card-body">{p.description}</p>
                <div style={{ marginTop: 16 }}>
                  <Link href={`/book?venue=${venue.slug}&package=${p.key}`} className="btn btn-ghost btn-block">
                    Start with {p.title}
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
