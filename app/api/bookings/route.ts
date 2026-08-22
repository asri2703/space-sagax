import { createBookingFromInput } from "@/lib/saga";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await createBookingFromInput(body);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Booking request failed" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
