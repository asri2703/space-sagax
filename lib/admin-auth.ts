// Shared admin auth helper for API routes.

import { getAdminFromCookie, checkAdminKey } from "@/lib/auth";

export async function requireAdmin(): Promise<Response | null> {
  const cookie = await getAdminFromCookie();
  if (!checkAdminKey(cookie)) {
    return Response.json(
      { error: "Admin access key missing or invalid. Please unlock the admin dashboard." },
      { status: 401 }
    );
  }
  return null;
}
