// Admin auth: simple shared-key authentication.
//
// The admin logs in by entering the ADMIN_ACCESS_KEY. We set a
// HttpOnly cookie `admin_key` with a 7-day expiry. API routes
// validate the cookie against process.env.ADMIN_ACCESS_KEY.
//
// This is not a session in the security sense — anyone with the
// cookie can hit admin routes. Treat the key as a bearer secret.

import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_key";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function getExpected(): string {
  return (process.env.ADMIN_ACCESS_KEY || "").trim();
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkAdminKey(provided: string | null | undefined): boolean {
  const expected = getExpected();
  if (!expected) return false;
  if (!provided) return false;
  return safeEqual(provided.trim(), expected);
}

export async function getAdminFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value || null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookie = await getAdminFromCookie();
  return checkAdminKey(cookie);
}

export async function setAdminCookie(key: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getCookieName(): string {
  return COOKIE_NAME;
}
