// GET /api/admin/invoice/[reference]/pdf
//   Admin: generate a PDF invoice for a single booking.
//   Auth via the admin_key cookie set by the admin login.

import { getAdminBooking, getPublicSettings, listPublicVenues } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { renderInvoicePdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { reference } = await params;
    const booking = await getAdminBooking(reference);
    if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });

    const [settings, venues] = await Promise.all([getPublicSettings(), listPublicVenues()]);
    const venue = venues.find((v) => v.id === booking.venue_id);

    const pdfBytes = await renderInvoicePdf({
      reference: booking.reference,
      venue_name: venue?.name || "—",
      name: booking.name,
      email: booking.email || undefined,
      whatsapp: booking.whatsapp || undefined,
      event_date: booking.event_date,
      start_time: booking.start_time,
      package_title: booking.human_price ? `Hall booking` : "Hall booking",
      amount_cents: booking.amount_cents,
      base_amount_cents: booking.base_amount_cents,
      price_label: booking.price_label || undefined,
      admin_note: booking.admin_note || undefined,
      status: booking.status,
      bank_name: settings.bank_name || undefined,
      bank_account_number: settings.bank_account_number || undefined,
      bank_account_name: settings.bank_account_name || undefined,
      company_name: settings.company_name,
      signature_lines: settings.signature_lines,
    });

    const url = new URL(request.url);
    const inline = url.searchParams.get("inline") === "1";
    return new Response(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="invoice-${reference}.pdf"`,
        "Content-Length": String(pdfBytes.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/admin/invoice/[ref]/pdf]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "PDF generation failed", stage: "pdf" },
      { status: 500 }
    );
  }
}
