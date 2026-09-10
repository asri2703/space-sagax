// GET /api/admin/bookings
//   Admin: list all bookings, newest first.

import { listAdminBookings } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const bookings = await listAdminBookings();
    return Response.json({ bookings });
  } catch (err) {
    console.error("[/api/admin/bookings]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load bookings" },
      { status: 500 }
    );
  }
}
