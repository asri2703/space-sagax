// GET   /api/admin/packages?venue=<id>
//   Admin: list packages (optionally filtered by venue).

import { listAdminPackages } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const url = new URL(request.url);
    const venueId = url.searchParams.get("venue") || undefined;
    const packages = await listAdminPackages(venueId);
    return Response.json({ packages });
  } catch (err) {
    console.error("[/api/admin/packages GET]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
