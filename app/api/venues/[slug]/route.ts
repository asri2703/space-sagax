// GET /api/venues/[slug]
//   Public single venue with its packages.

import { getPublicVenue, listPublicPackages } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await getPublicVenue(slug);
    if (!venue) {
      return Response.json({ error: "Venue not found" }, { status: 404 });
    }
    const packages = await listPublicPackages(venue.id);
    return Response.json({ venue, packages });
  } catch (err) {
    console.error("[/api/venues/[slug]]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load venue" },
      { status: 500 }
    );
  }
}
