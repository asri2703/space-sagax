// GET  /api/admin/venues
// POST /api/admin/venues
//   Admin: list or create venues.

import { listAdminVenues, createAdminVenue } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const venues = await listAdminVenues();
    return Response.json({ venues });
  } catch (err) {
    console.error("[/api/admin/venues GET]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.slug || !body.name) {
      return Response.json({ error: "slug and name are required" }, { status: 400 });
    }
    const venue = await createAdminVenue({
      slug: String(body.slug),
      name: String(body.name),
      description: body.description ? String(body.description) : null,
      short_description: body.short_description ? String(body.short_description) : null,
      address: body.address ? String(body.address) : null,
      city: body.city ? String(body.city) : null,
      state: body.state ? String(body.state) : null,
      hero_image: body.hero_image ? String(body.hero_image) : null,
      gallery_images: Array.isArray(body.gallery_images) ? body.gallery_images.map(String) : [],
      capacity: body.capacity != null ? Number(body.capacity) : null,
      amenities: Array.isArray(body.amenities) ? body.amenities.map(String) : [],
      active: body.active === false ? false : true,
      display_order: Number(body.display_order || 0),
    });
    return Response.json({ venue });
  } catch (err) {
    console.error("[/api/admin/venues POST]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
