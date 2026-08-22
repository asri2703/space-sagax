import { getPublicConfig, updateAdminSettingsFromInput } from "@/lib/saga";
import { readAdminSettings } from "@/db";
import { getRuntimeEnvValue } from "@/lib/runtime-env";

function ensureAdminKey(request: Request) {
  const expected = getRuntimeEnvValue("ADMIN_ACCESS_KEY");
  if (!expected) {
    return Response.json({ error: "ADMIN_ACCESS_KEY is not configured in local.env" }, { status: 503 });
  }
  const key = request.headers.get("x-admin-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (key.trim() !== expected) {
    return Response.json({ error: "Invalid admin access key" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = ensureAdminKey(request);
  if (denied) return denied;
  return Response.json({
    settings: await readAdminSettings(),
    public: await getPublicConfig(),
  });
}

export async function PATCH(request: Request) {
  const denied = ensureAdminKey(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const settings = await updateAdminSettingsFromInput(body as Record<string, unknown>);
    return Response.json({
      ok: true,
      settings,
      public: await getPublicConfig(),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 400 }
    );
  }
}
