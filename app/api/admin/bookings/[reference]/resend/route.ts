import { resendAdminBooking } from "@/lib/saga";
import { getRuntimeEnvValue } from "@/lib/runtime-env";

function ensureAdminKey(request: Request) {
  const key = request.headers.get("x-admin-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = getRuntimeEnvValue("ADMIN_ACCESS_KEY");
  if (!expected) {
    return Response.json({ error: "ADMIN_ACCESS_KEY is not configured in local.env" }, { status: 503 });
  }
  if (key.trim() !== expected) {
    return Response.json({ error: "Invalid admin access key" }, { status: 401 });
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const denied = ensureAdminKey(request);
  if (denied) return denied;

  try {
    const { reference } = await params;
    return Response.json(await resendAdminBooking(reference));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to resend invoice" },
      { status: 400 }
    );
  }
}
