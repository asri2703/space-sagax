// POST /api/admin/bookings/[reference]/resend
//   Admin: resend the booking confirmation email to the client.

import { getAdminBooking, getPublicSettings, listPublicVenues } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { reference } = await params;
    const booking = await getAdminBooking(reference);
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
    if (!booking.email) {
      return Response.json({ error: "Booking has no email on file" }, { status: 400 });
    }

    const [settings, venues] = await Promise.all([getPublicSettings(), listPublicVenues()]);
    const venue = venues.find((v) => v.id === booking.venue_id);

    const subject = `Booking ${reference} — ${venue?.name || settings.company_name}`;
    const html = renderEmailHtml(booking, venue?.name || settings.company_name, settings);
    const text = renderEmailText(booking, venue?.name || settings.company_name, settings);

    const result = await sendEmail({ to: booking.email, subject, html, text });
    if (!result.ok) {
      return Response.json(
        { error: result.error || "Email send failed", skipped: result.skipped },
        { status: result.skipped ? 503 : 500 }
      );
    }
    return Response.json({ ok: true, id: result.id, configured: isEmailConfigured() });
  } catch (err) {
    console.error("[/api/admin/bookings/[ref]/resend]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

function renderEmailHtml(
  b: { reference: string; name: string; event_date: string; start_time: string; human_price: string; admin_note: string | null },
  venueName: string,
  settings: { company_name: string; whatsapp: string; email: string; bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null; signature_lines: string[] }
): string {
  const note = b.admin_note
    ? `<tr><td colspan="2" style="padding:14px 0;color:#1e293b;">${escapeHtml(b.admin_note).replace(/\n/g, "<br>")}</td></tr>`
    : "";
  const bank = settings.bank_name
    ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;">Bank: <strong>${escapeHtml(settings.bank_name)}</strong>${settings.bank_account_number ? ` (${escapeHtml(settings.bank_account_number)})` : ""}${settings.bank_account_name ? ` — ${escapeHtml(settings.bank_account_name)}` : ""}</p>`
    : "";
  const sig = settings.signature_lines.map((l) => escapeHtml(l)).join(" &middot; ");
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#fffdf5;font-family:Plus Jakarta Sans,system-ui,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8b5cf6;">${escapeHtml(settings.company_name)}</p>
    <h1 style="margin:0 0 24px;font-size:28px;letter-spacing:-.01em;">Booking ${escapeHtml(b.reference)}</h1>
    <p>Hi ${escapeHtml(b.name)},</p>
    <p>Thank you for booking <strong>${escapeHtml(venueName)}</strong>. Here are your booking details:</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0;">
      <tr><td style="padding:8px 0;color:#64748b;width:120px;">Reference</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(b.reference)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Event date</td><td style="padding:8px 0;font-weight:700;">${formatDate(b.event_date)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Start time</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(b.start_time)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(b.human_price)}</td></tr>
      ${note}
    </table>
    ${bank}
    <p style="margin:24px 0 0;color:#64748b;font-size:14px;">If you have any questions, reply to this email or WhatsApp us at <strong>${escapeHtml(settings.whatsapp)}</strong>.</p>
    <p style="margin:32px 0 0;color:#1e293b;font-weight:700;">${sig}</p>
  </div>
</body></html>`;
}

function renderEmailText(
  b: { reference: string; name: string; event_date: string; start_time: string; human_price: string; admin_note: string | null },
  venueName: string,
  settings: { company_name: string; whatsapp: string; email: string; bank_name: string | null; bank_account_number: string | null; bank_account_name: string | null; signature_lines: string[] }
): string {
  return [
    `${settings.company_name}`,
    `Booking ${b.reference}`,
    ``,
    `Hi ${b.name},`,
    ``,
    `Thank you for booking ${venueName}.`,
    ``,
    `Reference: ${b.reference}`,
    `Event date: ${formatDate(b.event_date)}`,
    `Start time: ${b.start_time}`,
    `Amount: ${b.human_price}`,
    b.admin_note ? `\nNote: ${b.admin_note}\n` : "",
    settings.bank_name ? `\nBank: ${settings.bank_name}${settings.bank_account_number ? ` (${settings.bank_account_number})` : ""}${settings.bank_account_name ? ` — ${settings.bank_account_name}` : ""}\n` : "",
    ``,
    `Questions? WhatsApp ${settings.whatsapp} or email ${settings.email}.`,
    ``,
    settings.signature_lines.join(" · "),
  ].filter(Boolean).join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
