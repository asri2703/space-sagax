import { listBookingsForAdmin } from "@/lib/saga";
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

export async function GET(request: Request) {
  const denied = ensureAdminKey(request);
  if (denied) return denied;
  return Response.json({ items: await listBookingsForAdmin() });
}
