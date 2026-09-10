// PATCH /api/admin/packages/[id]
//   Admin: update a package (price, duration, title, etc.).

import { updateAdminPackage } from "@/lib/data";
import { formatMyr } from "@/lib/format";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of ["title", "description", "key"]) {
      if (typeof body[k] === "string") patch[k] = body[k];
    }
    if (body.duration_minutes != null) patch.duration_minutes = Number(body.duration_minutes);
    if (body.amount_cents != null || body.amountCents != null) {
      const cents = Math.round(Number(body.amount_cents ?? body.amountCents));
      patch.amount_cents = cents;
      patch.human_price = formatMyr(cents);
    }
    if (typeof body.active === "boolean") patch.active = body.active;
    if (body.display_order != null) patch.display_order = Number(body.display_order);
    const pkg = await updateAdminPackage(id, patch as never);
    return Response.json({ package: pkg });
  } catch (err) {
    console.error("[/api/admin/packages/[id] PATCH]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
