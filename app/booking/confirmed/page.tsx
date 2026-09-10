// /booking/confirmed?ref=<reference>
//   Post-payment landing. For Billplz the redirect URL is this page.
//   For manual / bank_transfer the booking flow pushes here too.

import { getAdminBooking, getPublicSettings, listPublicVenues } from "@/lib/data";
import { Logo } from "@/components/Logo";
import { formatDate, formatMyr } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = { ref?: string };

export default async function ConfirmedPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;
  if (!sp.ref) return notFound();
  const booking = await getAdminBooking(sp.ref);
  if (!booking) return notFound();
  const [settings, venues] = await Promise.all([getPublicSettings(), listPublicVenues()]);
  const venue = venues.find((v) => v.id === booking.venue_id);

  return (
    <main className="container">
      <header className="site-header">
        <Logo />
        <Link href="/" className="btn btn-ghost btn-pill">← Back home</Link>
      </header>

      <section className="section">
        <div className="card card-sticker card-confirm">
          <div className="confirm-stamp">✓</div>
          <h1 className="display-1">Booking received</h1>
          <p className="lead">
            Thanks {booking.name}! Your booking for <strong>{venue?.name || settings.company_name}</strong> on{" "}
            <strong>{formatDate(booking.event_date)}</strong> at <strong>{booking.start_time}</strong> is in.
          </p>
          <p>Reference: <strong>{booking.reference}</strong></p>

          {booking.status === "pending_payment" && booking.payment_method === "bank_transfer" && (
            <div className="bank-card">
              <h3>Bank transfer details</h3>
              <p>{settings.bank_name}</p>
              {settings.bank_account_number && <p>Account: <strong>{settings.bank_account_number}</strong></p>}
              {settings.bank_account_name && <p>Name: <strong>{settings.bank_account_name}</strong></p>}
              <p className="muted small">Send the total <strong>{formatMyr(booking.amount_cents)}</strong> and we&apos;ll confirm once it lands.</p>
            </div>
          )}

          {booking.status === "pending_payment" && booking.payment_method === "manual" && (
            <p className="muted">Pay on the day. We&apos;ll send you a reminder.</p>
          )}

          {booking.status === "pending_payment" && booking.payment_method === "billplz" && (
            <p className="muted">We&apos;ll redirect you to Billplz to complete payment.</p>
          )}

          <p className="muted">
            Questions? WhatsApp <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}>{settings.whatsapp}</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
