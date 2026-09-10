// Public booking page at /book
//   Server-renders the venue, packages, and the current month's
//   availability. The interactive calendar and form live in the
//   BookingFlow client component.

import { listPublicVenues, listPublicPackages, getMonthAvailability } from "@/lib/data";
import { getPublicSettings } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { BookingFlow } from "./_client";
import { notFound } from "next/navigation";
import { formatMyr } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = { venue?: string };

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
        <a href="/" className="btn btn-ghost btn-pill">← Back home</a>
      </header>

      <section className="section">
        <span className="kicker">{venue.city || "Senawang"}</span>
        <h1 className="display-1">Book {venue.name}</h1>
        {venue.short_description && <p className="lead">{venue.short_description}</p>}

        <BookingFlow
          venue={venue}
          packages={packages}
          initialAvailability={initialAvailability}
          initialMonth={initialMonth}
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

      <section className="section">
        <h2 className="display-2">Packages</h2>
        <div className="package-grid">
          {packages.map((p) => (
            <div key={p.id} className="card card-pop">
              <h3 className="card-title">{p.title}</h3>
              <p className="price">{formatMyr(p.amount_cents)}</p>
              <p className="card-body">{p.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
