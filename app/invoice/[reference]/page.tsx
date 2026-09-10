import { listBookingsForAdmin, getPublicConfig } from "@/lib/saga";
import type { AdminBookingSummary } from "@/lib/saga";
import { readAdminSettings } from "@/db";
import { getRuntimeEnvValue } from "@/lib/runtime-env";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";
import "./invoice.css";

type SearchParams = Promise<{ key?: string; ref?: string }>;

function formatMyr(cents: number): string {
  const n = Number(cents || 0) / 100;
  return "RM" + n.toFixed(2);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  // Treat YYYY-MM-DD as a calendar date in Asia/Kuala_Lumpur
  try {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function formatTime(t: string | undefined): string {
  if (!t) return "—";
  return t;
}

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: SearchParams;
}) {
  // Auth: the URL must carry ?key=ADMIN_ACCESS_KEY, just like the
  // /api/admin/* routes. This lets the admin open a printable invoice
  // for a specific booking, and forward the link to a client without
  // needing a session login. Sharing the link still requires the key.
  const { key } = await searchParams;
  const expected = getRuntimeEnvValue("ADMIN_ACCESS_KEY");
  if (!expected) {
    return (
      <main className="invoice-shell">
        <p className="invoice-error">
          ADMIN_ACCESS_KEY is not configured on the server.
        </p>
      </main>
    );
  }
  if (!key || key.trim() !== expected) {
    return (
      <main className="invoice-shell">
        <p className="invoice-error">
          Missing or invalid access key. Open this invoice from the admin
          dashboard's <strong>Download invoice</strong> button.
        </p>
      </main>
    );
  }

  const { reference } = await params;
  const items: AdminBookingSummary[] = await listBookingsForAdmin();
  const booking = items.find((b) => b.reference === reference);
  if (!booking) {
    notFound();
  }

  const settings = await readAdminSettings();
  const pub = await getPublicConfig();

  const baseAmount = Number(
    booking.base_amount_cents || booking.amount_cents || 0
  );
  const customAmount = Number(booking.amount_cents || 0);
  const hasOverride = customAmount !== baseAmount;
  const status = booking.status || "pending_review";
  const statusLabel: Record<string, string> = {
    confirmed: "Confirmed",
    pending_payment: "Pending payment",
    pending_review: "Pending review",
    cancelled: "Cancelled",
  };

  return (
    <main className="invoice-shell">
      <div className="invoice-toolbar no-print">
        <PrintButton />
        <p className="invoice-toolbar-hint">
          Use your browser's <strong>Print</strong> dialog
          (Ctrl/Cmd + P) and choose <strong>Save as PDF</strong>.
        </p>
      </div>

      <article className="invoice-page">
        <header className="invoice-head">
          <div className="invoice-brand">
            <span className="invoice-mark" aria-hidden>SX</span>
            <div>
              <p className="invoice-eyebrow">Saga X Space</p>
              <h1>Invoice</h1>
            </div>
          </div>
          <div className="invoice-meta">
            <div>
              <span>Reference</span>
              <strong>{booking.reference}</strong>
            </div>
            <div>
              <span>Issued</span>
              <strong>{formatDate(new Date().toISOString().slice(0, 10))}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className={`invoice-status invoice-status-${status}`}>
                {statusLabel[status] || status}
              </strong>
            </div>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <p className="invoice-section-label">From</p>
            <p className="invoice-party-name">Saga X Space</p>
            <p>Hall rental in Senawang, Negeri Sembilan</p>
            {pub?.bank_name ? (
              <p className="invoice-bank">
                <span>Bank:</span> {pub.bank_name}
                {pub.bank_account_number ? <> ({pub.bank_account_number})</> : null}
                {pub.bank_account_name ? <> — {pub.bank_account_name}</> : null}
              </p>
            ) : null}
          </div>
          <div>
            <p className="invoice-section-label">To</p>
            <p className="invoice-party-name">{booking.name || "—"}</p>
            {booking.email ? <p>{booking.email}</p> : null}
            {booking.whatsapp ? <p>{booking.whatsapp}</p> : null}
          </div>
        </section>

        <section className="invoice-event">
          <div>
            <span>Event date</span>
            <strong>{formatDate(booking.event_date)}</strong>
          </div>
          <div>
            <span>Start time</span>
            <strong>{formatTime(booking.start_time)}</strong>
          </div>
          <div>
            <span>Package</span>
            <strong>{booking.package_title || "—"}</strong>
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="invoice-amount-col">Amount (MYR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <p className="invoice-line-title">
                  {booking.package_title || "Hall booking"}
                </p>
                <p className="invoice-line-sub">
                  Base price · {formatDate(booking.event_date)} · {formatTime(booking.start_time)}
                </p>
              </td>
              <td className="invoice-amount-col">
                {hasOverride ? (
                  <span className="invoice-strike">{formatMyr(baseAmount)}</span>
                ) : (
                  formatMyr(baseAmount)
                )}
              </td>
            </tr>
            {hasOverride ? (
              <tr>
                <td>
                  <p className="invoice-line-title">
                    Custom pricing
                    {booking.price_label ? (
                      <span className="invoice-line-tag"> {booking.price_label}</span>
                    ) : null}
                  </p>
                  <p className="invoice-line-sub">
                    Adjusted for this booking.
                  </p>
                </td>
                <td className="invoice-amount-col">{formatMyr(customAmount)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td className="invoice-total-label">Total due</td>
              <td className="invoice-amount-col invoice-total">
                {formatMyr(customAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {booking.admin_note ? (
          <section className="invoice-note">
            <p className="invoice-section-label">Note</p>
            <p>{booking.admin_note}</p>
          </section>
        ) : null}

        <footer className="invoice-foot">
          <p>
            Thank you for booking Saga X Space. Please quote the reference
            number when contacting us.
          </p>
          <p className="invoice-foot-contact">
            WhatsApp {pub?.whatsapp || "60137732703"} ·{" "}
            sagadigitaladvertising@gmail.com
          </p>
        </footer>
      </article>
    </main>
  );
}
