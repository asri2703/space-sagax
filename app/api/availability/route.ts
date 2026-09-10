// GET /api/availability?venue=<slug>&month=YYYY-MM
//   Returns the days of the month with their booking status so the
//   public site can render a calendar.

import { getPublicVenue, getMonthAvailability } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("venue") || "";
    const month = url.searchParams.get("month") || "";
    if (!slug || !month) {
      return Response.json({ error: "venue and month are required" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
    }

    const venue = await getPublicVenue(slug);
    if (!venue) {
      return Response.json({ error: "Venue not found" }, { status: 404 });
    }

    const result = await getMonthAvailability(venue.id, month);
    return Response.json(result);
  } catch (err) {
    console.error("[/api/availability]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load availability" },
      { status: 500 }
    );
  }
}
