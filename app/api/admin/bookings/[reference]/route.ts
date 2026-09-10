// GET /api/admin/bookings/[reference]
// PATCH /api/admin/bookings/[reference]
//   Admin: read or update a single booking.

import { getAdminBooking, updateAdminBooking } from "@/lib/data";
import { getSupabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { formatMyr } from "@/lib/format";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["pending_payment", "pending_review", "confirmed", "cancelled"] as const;
const VALID_PAYMENT = ["billplz", "manual", "bank_transfer"] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { reference } = await params;
    const booking = await getAdminBooking(reference);
    if (!booking) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ booking });
  } catch (err) {
    console.error("[/api/admin/bookings/[ref] GET]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { reference } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const existing = await getAdminBooking(reference);
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};

    if (typeof body.status === "string") {
      if (!VALID_STATUS.includes(body.status as never)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = body.status;
    }
    if (typeof body.admin_note === "string") {
      patch.admin_note = body.admin_note.trim();
    }
    if (typeof body.price_label === "string") {
      patch.price_label = body.price_label.trim();
    }
    if (body.amount_cents !== undefined || body.amountCents !== undefined) {
      const amt = Number(body.amount_cents ?? body.amountCents);
      if (!Number.isFinite(amt) || amt < 0) {
        return Response.json({ error: "Invalid amount_cents" }, { status: 400 });
      }
      const cents = Math.round(amt);
      patch.amount_cents = cents;
      patch.human_price = formatMyr(cents);
    }
    if (typeof body.payment_method === "string") {
      if (!VALID_PAYMENT.includes(body.payment_method as never)) {
        return Response.json({ error: "Invalid payment_method" }, { status: 400 });
      }
      patch.payment_method = body.payment_method;
    }
    if (typeof body.payment_reference === "string") {
      patch.payment_reference = body.payment_reference.trim();
    }

    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from("bookings")
      .update(patch)
      .eq("reference", reference)
      .select()
      .single();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ booking: data });
  } catch (err) {
    console.error("[/api/admin/bookings/[ref] PATCH]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update booking" },
      { status: 500 }
    );
  }
}
