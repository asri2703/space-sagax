// POST   /api/admin/login
// DELETE /api/admin/login
// GET    /api/admin/login
//   Admin: set or clear the HttpOnly admin_key cookie, or check
//   the current session.

import { checkAdminKey, setAdminCookie, clearAdminCookie, getAdminFromCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { key?: string };
    if (!body.key || !checkAdminKey(body.key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 401 });
    }
    await setAdminCookie(body.key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const cookie = await getAdminFromCookie();
  return NextResponse.json({ authed: checkAdminKey(cookie) });
}
