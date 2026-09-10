// Server-side PDF invoice generator.
// GET /api/admin/invoice/[reference]/pdf?key=...&inline=1
//   - Auth: ADMIN_ACCESS_KEY via ?key= or cookie `admin_key`
//   - Returns: application/pdf (attachment) with filename
//     "invoice-<reference>.pdf". Set ?inline=1 to preview in browser.

import { listBookingsForAdmin, getPublicConfig } from "@/lib/saga";
import type { AdminBookingSummary } from "@/lib/saga";
import { readAdminSettings } from "@/db";
import { getRuntimeEnvValue } from "@/lib/runtime-env";
import { renderHtmlToPdf } from "@/lib/pdf";
import { cookies } from "next/headers";

function formatMyr(cents: number): string {
  const n = Number(cents || 0) / 100;
  return "RM" + n.toFixed(2);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInvoiceHtml(booking: AdminBookingSummary, bank: {
  name?: string;
  account_number?: string;
  account_name?: string;
} | null): string {
  const baseAmount = Number(booking.base_amount_cents || booking.amount_cents || 0);
  const customAmount = Number(booking.amount_cents || 0);
  const hasOverride = customAmount !== baseAmount;
  const status = booking.status || "pending_review";
  const statusLabel: Record<string, string> = {
    confirmed: "Confirmed",
    pending_payment: "Pending payment",
    pending_review: "Pending review",
    cancelled: "Cancelled",
  };
  const statusColor: Record<string, string> = {
    confirmed: "#34d399",
    pending_payment: "#fbbf24",
    pending_review: "#fbbf24",
    cancelled: "#f43f5e",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(booking.reference || "")}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: "Plus Jakarta Sans", -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    background: #fff;
    font-size: 12px;
    line-height: 1.4;
  }
  .page { padding: 24px 28px; max-width: 760px; margin: 0 auto; }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 2px dashed #cbd5e1;
  }
  .brand { display: flex; gap: 12px; align-items: center; }
  .mark {
    width: 44px; height: 44px;
    background: #8b5cf6; color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    border: 2px solid #1e293b;
    border-radius: 11px;
    font-weight: 800; font-size: 16px;
    box-shadow: 3px 3px 0 0 #1e293b;
  }
  .eyebrow {
    margin: 0; font-size: 9px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; color: #8b5cf6;
  }
  h1 { margin: 2px 0 0; font-size: 28px; line-height: 1; }
  .meta { display: grid; grid-template-columns: repeat(3, auto); gap: 4px 18px; text-align: right; }
  .meta > div { display: flex; flex-direction: column; }
  .meta span {
    font-size: 8px; text-transform: uppercase; letter-spacing: 1px;
    color: #64748b; font-weight: 700;
  }
  .meta strong { font-size: 12px; color: #1e293b; }
  .status {
    display: inline-block; padding: 3px 10px;
    border: 2px solid #1e293b; border-radius: 999px;
    font-size: 10px !important; font-weight: 700 !important;
    background: ${statusColor[status] || "#cbd5e1"};
  }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
  .label {
    margin: 0 0 4px; font-size: 8px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; color: #8b5cf6;
  }
  .name { margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #1e293b; }
  .parties p { margin: 0; color: #475569; }
  .bank { margin-top: 6px !important; font-size: 11px !important; color: #1e293b !important; }
  .bank .lbl { color: #8b5cf6; font-weight: 700; }
  .event {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 12px; margin: 18px 0 0; padding: 12px 14px;
    background: #fffaeb;
    border: 2px solid #1e293b; border-radius: 11px;
    box-shadow: 3px 3px 0 0 #1e293b;
  }
  .event > div { display: flex; flex-direction: column; }
  .event span {
    font-size: 8px; text-transform: uppercase; letter-spacing: 1px;
    color: #64748b; font-weight: 700;
  }
  .event strong { font-size: 12px; color: #1e293b; margin-top: 1px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { text-align: left; padding: 10px 12px; vertical-align: top; font-size: 11px; }
  th {
    background: #1e293b; color: #fff; font-size: 8px;
    text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;
  }
  tbody tr { border-bottom: 1px solid #e2e8f0; }
  .amt { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .line-title { margin: 0; font-weight: 700; color: #1e293b; }
  .line-sub { margin: 2px 0 0; font-size: 9px; color: #64748b; }
  .tag {
    display: inline-block; margin-left: 6px; padding: 1px 7px;
    font-size: 8px; font-weight: 600; background: #f472b6; color: #fff;
    border-radius: 999px;
  }
  .strike { text-decoration: line-through; color: #94a3b8; }
  tfoot td { padding: 12px; border-top: 2px solid #1e293b; background: #fffaeb; }
  .total-label { text-align: right; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 1.5px; }
  .total { font-size: 16px !important; font-weight: 800 !important; color: #8b5cf6 !important; }
  .note {
    margin-top: 18px; padding: 12px 14px;
    background: #fff7ed; border: 2px dashed #cbd5e1; border-radius: 10px;
  }
  .note p { margin: 0; font-size: 11px; }
  .foot {
    margin-top: 22px; padding-top: 14px; border-top: 2px dashed #cbd5e1;
    text-align: center; color: #64748b; font-size: 10px;
  }
  .foot p { margin: 0; }
  .foot .contact { margin-top: 4px; color: #1e293b; font-weight: 600; }
</style>
</head>
<body>
<div class="page">
  <header class="head">
    <div class="brand">
      <span class="mark">SX</span>
      <div>
        <p class="eyebrow">Saga X Space</p>
        <h1>Invoice</h1>
      </div>
    </div>
    <div class="meta">
      <div><span>Reference</span><strong>${escapeHtml(booking.reference || "")}</strong></div>
      <div><span>Issued</span><strong>${formatDate(new Date().toISOString().slice(0, 10))}</strong></div>
      <div><span>Status</span><strong class="status">${escapeHtml(statusLabel[status] || status)}</strong></div>
    </div>
  </header>

  <section class="parties">
    <div>
      <p class="label">From</p>
      <p class="name">Saga X Space</p>
      <p>Hall rental in Senawang, Negeri Sembilan</p>
      ${bank?.name ? `<p class="bank"><span class="lbl">Bank:</span> ${escapeHtml(bank.name)}${bank.account_number ? ` (${escapeHtml(bank.account_number)})` : ""}${bank.account_name ? ` — ${escapeHtml(bank.account_name)}` : ""}</p>` : ""}
    </div>
    <div>
      <p class="label">To</p>
      <p class="name">${escapeHtml(booking.name || "—")}</p>
      ${booking.email ? `<p>${escapeHtml(String(booking.email))}</p>` : ""}
      ${booking.whatsapp ? `<p>${escapeHtml(String(booking.whatsapp))}</p>` : ""}
    </div>
  </section>

  <section class="event">
    <div><span>Event date</span><strong>${formatDate(booking.event_date)}</strong></div>
    <div><span>Start time</span><strong>${escapeHtml(booking.start_time || "—")}</strong></div>
    <div><span>Package</span><strong>${escapeHtml(booking.package_title || "—")}</strong></div>
  </section>

  <table>
    <thead>
      <tr><th>Description</th><th class="amt">Amount (MYR)</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <p class="line-title">${escapeHtml(booking.package_title || "Hall booking")}</p>
          <p class="line-sub">Base price · ${formatDate(booking.event_date)} · ${escapeHtml(booking.start_time || "")}</p>
        </td>
        <td class="amt">${hasOverride ? `<span class="strike">${formatMyr(baseAmount)}</span>` : formatMyr(baseAmount)}</td>
      </tr>
      ${hasOverride
        ? `<tr>
        <td>
          <p class="line-title">Custom pricing${booking.price_label ? `<span class="tag">${escapeHtml(String(booking.price_label))}</span>` : ""}</p>
          <p class="line-sub">Adjusted for this booking.</p>
        </td>
        <td class="amt">${formatMyr(customAmount)}</td>
      </tr>`
        : ""}
    </tbody>
    <tfoot>
      <tr>
        <td class="total-label">Total due</td>
        <td class="amt total">${formatMyr(customAmount)}</td>
      </tr>
    </tfoot>
  </table>

  ${booking.admin_note
    ? `<section class="note"><p class="label">Note</p><p>${escapeHtml(String(booking.admin_note))}</p></section>`
    : ""}

  <footer class="foot">
    <p>Thank you for booking Saga X Space. Please quote the reference number when contacting us.</p>
    <p class="contact">WhatsApp 60137732703 · sagadigitaladvertising@gmail.com</p>
  </footer>
</div>
</body>
</html>`;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  // ── Auth ──────────────────────────────────────────────
  const expected = getRuntimeEnvValue("ADMIN_ACCESS_KEY");
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "ADMIN_ACCESS_KEY is not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key") || "";
  const cookieStore = await cookies();
  const cookieKey = cookieStore.get("admin_key")?.value || "";
  const headerKey = request.headers.get("x-admin-key") || "";
  const provided = (queryKey || cookieKey || headerKey).trim();

  if (!provided || provided !== expected) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing admin key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Find booking ──────────────────────────────────────
  const { reference } = await params;
  const items: AdminBookingSummary[] = await listBookingsForAdmin();
  const booking = items.find((b) => b.reference === reference);
  if (!booking) {
    return new Response(
      JSON.stringify({ error: "Booking not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Build PDF ─────────────────────────────────────────
  const pub = await getPublicConfig();
  const settings = await readAdminSettings();
  const bank = pub
    ? { name: pub.bank_name, account_number: pub.bank_account_number, account_name: pub.bank_account_name }
    : null;

  const html = buildInvoiceHtml(booking, bank);
  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html, { format: "A4" });
  } catch (err) {
    // Bubble up a clear error so the admin UI can show it instead of
    // a generic 500 with no message.
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return new Response(
      JSON.stringify({ error: message, stage: "pdf" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const inline = url.searchParams.get("inline") === "1";
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="invoice-${reference}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  });
}
