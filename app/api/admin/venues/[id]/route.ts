// PATCH /api/admin/venues/[id]
//   Admin: update an existing venue.

import { updateAdminVenue } from "@/lib/data";
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
    for (const k of ["name", "description", "short_description", "address", "city", "state", "hero_image", "slug"]) {
      if (typeof body[k] === "string") patch[k] = body[k];
    }
    if (Array.isArray(body.gallery_images)) patch.gallery_images = body.gallery_images.map(String);
    if (Array.isArray(body.amenities)) patch.amenities = body.amenities.map(String);
    if (typeof body.active === "boolean") patch.active = body.active;
    if (body.capacity != null) patch.capacity = Number(body.capacity);
    if (body.display_order != null) patch.display_order = Number(body.display_order);
    const venue = await updateAdminVenue(id, patch);
    return Response.json({ venue });
  } catch (err) {
    console.error("[/api/admin/venues/[id] PATCH]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
