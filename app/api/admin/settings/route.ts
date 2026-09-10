// GET   /api/admin/settings
// PATCH /api/admin/settings
//   Admin: read or update the singleton settings row.

import { getPublicSettings, updateAdminSettings } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const settings = await getPublicSettings();
    return Response.json({ settings });
  } catch (err) {
    console.error("[/api/admin/settings GET]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of [
      "bank_name",
      "bank_account_number",
      "bank_account_name",
      "whatsapp",
      "email",
      "company_name",
      "resend_from",
    ]) {
      if (typeof body[k] === "string") patch[k] = body[k];
    }
    if (Array.isArray(body.signature_lines)) {
      patch.signature_lines = body.signature_lines.map(String);
    }
    const settings = await updateAdminSettings(patch as never);
    return Response.json({ settings });
  } catch (err) {
    console.error("[/api/admin/settings PATCH]", err);
    return Response.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
