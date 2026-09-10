// POST /api/billplz/callback
//   Billplz webhook. Receives payment status, updates the booking.
//   Reference is passed via reference_1 in the create_bill call.

import { getAdminBooking, updateAdminBooking } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      data[k] = String(v);
    }

    // Billplz sends: id, collection_id, paid, state, amount, paid_amount,
    // reference_1 (our booking ref), reference_2, etc.
    const reference = data.reference_1 || data.billplz_reference_1 || "";
    const paid = data.paid === "true";
    const state = data.state || (paid ? "paid" : "due");

    if (!reference) {
      return Response.json({ error: "missing reference_1" }, { status: 400 });
    }

    const booking = await getAdminBooking(reference);
    if (!booking) {
      return Response.json({ error: "booking not found" }, { status: 404 });
    }

    if (paid || state === "paid") {
      await updateAdminBooking(reference, {
        status: "confirmed",
        payment_reference: `billplz:${data.id || ""}`,
      });
    } else if (state === "deleted") {
      await updateAdminBooking(reference, { status: "cancelled" });
    }
    // For "due" / overdue we leave the booking in pending_payment.

    // Billplz expects an "OK" string response to stop retries.
    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (err) {
    console.error("[/api/billplz/callback]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Callback failed" },
      { status: 500 }
    );
  }
}
