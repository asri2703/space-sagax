// GET /api/venues
//   Public list of active venues. Powers the public site.

import { listPublicVenues } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const venues = await listPublicVenues();
    return Response.json({ venues });
  } catch (err) {
    console.error("[/api/venues]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load venues" },
      { status: 500 }
    );
  }
}
