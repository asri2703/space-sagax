import { env } from "cloudflare:workers";
import { patchAdminBooking } from "@/lib/saga";

function ensureAdminKey(request: Request) {
  const key = request.headers.get("x-admin-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = String(env.ADMIN_ACCESS_KEY || "").trim();
  if (!expected) {
    return Response.json({ error: "ADMIN_ACCESS_KEY is not configured in local.env" }, { status: 503 });
  }
  if (key.trim() !== expected) {
    return Response.json({ error: "Invalid admin access key" }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { reference: string } }
) {
  const denied = ensureAdminKey(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const booking = await patchAdminBooking(params.reference, body as never);
    return Response.json({ booking });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update booking" },
      { status: 400 }
    );
  }
}
