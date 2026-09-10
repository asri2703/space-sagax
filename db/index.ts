// Saga X Space data layer.
//
// Primary store: Supabase `crm_data` table — we use one row per
// "namespace" so we never collide with other apps using the same
// project (e.g. work2u-crm). Two rows are owned by this app:
//   id = "saga-x-space-bookings"        → { bookings: BookingRecord[] }
//   id = "saga-x-space-admin-settings"  → AdminSettings
//
// Fallback: local filesystem JSON files in cwd/data/. This keeps the
// app functional during local dev (no Supabase round-trips) and also
// if Supabase is briefly unreachable. Reads always prefer Supabase
// when the env vars are present; writes go to both so a switch
// between environments is seamless.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type BookingRecord = Record<string, unknown> & {
  reference: string;
  created_at: string;
  updated_at: string;
};

export type AdminSettings = {
  package_overrides: {
    hour: AdminPackageOverride | null;
    four: AdminPackageOverride | null;
    full: AdminPackageOverride | null;
  };
};

export type AdminPackageOverride = {
  amount_cents: number;
  label: string;
  updated_at: string;
};

const SUPABASE_BOOKINGS_ID = "saga-x-space-bookings";
const SUPABASE_SETTINGS_ID = "saga-x-space-admin-settings";

const dataDir = path.join(process.cwd(), "data");
const bookingsPath = path.join(dataDir, "bookings.json");
const settingsPath = path.join(dataDir, "admin-settings.json");

let bookingsCache: BookingRecord[] | null = null;
let adminSettingsCache: AdminSettings | null = null;
let loadPromise: Promise<void> | null = null;

function defaultAdminSettings(): AdminSettings {
  return {
    package_overrides: {
      hour: null,
      four: null,
      full: null,
    },
  };
}

function normalizeAdminSettings(input: unknown): AdminSettings {
  const settings = defaultAdminSettings();
  const raw =
    typeof input === "object" && input && "package_overrides" in input
      ? (input as { package_overrides?: Record<string, unknown> }).package_overrides
      : {};

  for (const key of ["hour", "four", "full"] as const) {
    const override = raw?.[key];
    if (!override || typeof override !== "object") {
      settings.package_overrides[key] = null;
      continue;
    }

    const value = override as Partial<AdminPackageOverride>;
    const amount = Number(value.amount_cents);
    settings.package_overrides[key] =
      Number.isFinite(amount) && amount > 0
        ? {
            amount_cents: Math.round(amount),
            label: String(value.label || "").trim(),
            updated_at: String(value.updated_at || new Date().toISOString()),
          }
        : null;
  }

  return settings;
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function persistJsonFile(filePath: string, value: unknown) {
  try {
    await mkdir(dataDir, { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch {
    // Vercel deployments can be read-only. Best-effort only.
  }
}

// ── Supabase transport ─────────────────────────────────────────────

type SupabaseConfig = {
  url: string;
  serviceKey: string;
};

function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;
  return { url: url.replace(/\/$/, ""), serviceKey };
}

async function supabaseGetRow<T>(cfg: SupabaseConfig, id: string): Promise<T | null> {
  try {
    const r = await fetch(`${cfg.url}/rest/v1/crm_data?id=eq.${encodeURIComponent(id)}&select=data,updated_at`, {
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        Accept: "application/json",
      },
      // Avoid Next.js fetch caching — data must be live on every read.
      cache: "no-store",
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as Array<{ data: T; updated_at: string }>;
    return rows[0]?.data ?? null;
  } catch {
    return null;
  }
}

async function supabaseUpsertRow<T>(cfg: SupabaseConfig, id: string, data: T): Promise<boolean> {
  try {
    const r = await fetch(`${cfg.url}/rest/v1/crm_data`, {
      method: "POST",
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([{ id, data, updated_at: new Date().toISOString() }]),
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function readBookingsFromSupabase(): Promise<BookingRecord[] | null> {
  const cfg = readSupabaseConfig();
  if (!cfg) return null;
  const data = await supabaseGetRow<{ bookings?: BookingRecord[] }>(cfg, SUPABASE_BOOKINGS_ID);
  if (!data) return null;
  return Array.isArray(data.bookings) ? data.bookings : [];
}

async function readSettingsFromSupabase(): Promise<AdminSettings | null> {
  const cfg = readSupabaseConfig();
  if (!cfg) return null;
  const data = await supabaseGetRow<AdminSettings>(cfg, SUPABASE_SETTINGS_ID);
  return data || null;
}

async function writeBookingsToSupabase(items: BookingRecord[]): Promise<boolean> {
  const cfg = readSupabaseConfig();
  if (!cfg) return false;
  return supabaseUpsertRow(cfg, SUPABASE_BOOKINGS_ID, { bookings: items });
}

async function writeSettingsToSupabase(settings: AdminSettings): Promise<boolean> {
  const cfg = readSupabaseConfig();
  if (!cfg) return false;
  return supabaseUpsertRow(cfg, SUPABASE_SETTINGS_ID, settings);
}

// ── Loader / cache ──────────────────────────────────────────────────

async function loadFromSupabaseOrFs(): Promise<{
  bookings: BookingRecord[];
  settings: AdminSettings;
}> {
  // Try Supabase first
  const sbBookings = await readBookingsFromSupabase();
  if (sbBookings !== null) {
    const sbSettings = (await readSettingsFromSupabase()) || defaultAdminSettings();
    return { bookings: sbBookings, settings: normalizeAdminSettings(sbSettings) };
  }
  // Fallback to local filesystem
  return {
    bookings: await readJsonFile<BookingRecord[]>(bookingsPath, []),
    settings: normalizeAdminSettings(
      await readJsonFile<AdminSettings>(settingsPath, defaultAdminSettings())
    ),
  };
}

async function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const { bookings, settings } = await loadFromSupabaseOrFs();
      bookingsCache = bookings;
      adminSettingsCache = settings;
    })();
  }
  await loadPromise;
}

function sortBookings(items: BookingRecord[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(String(a.created_at || 0)).getTime();
    const bTime = new Date(String(b.created_at || 0)).getTime();
    return bTime - aTime;
  });
}

export async function readBookings(): Promise<BookingRecord[]> {
  await ensureLoaded();
  return sortBookings(bookingsCache || []);
}

export async function getBooking(reference: string): Promise<BookingRecord | null> {
  await ensureLoaded();
  return (bookingsCache || []).find((booking) => booking.reference === reference) || null;
}

export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  await ensureLoaded();
  const next = (bookingsCache || []).filter((item) => item.reference !== booking.reference);
  next.unshift(booking);
  bookingsCache = next;
  // Best-effort: write to both Supabase and filesystem so a switch
  // between environments doesn't lose data.
  await Promise.all([
    writeBookingsToSupabase(bookingsCache),
    persistJsonFile(bookingsPath, bookingsCache),
  ]);
  return booking;
}

export async function updateBooking(
  reference: string,
  updater: (booking: BookingRecord) => BookingRecord | Promise<BookingRecord>
): Promise<BookingRecord | null> {
  const existing = await getBooking(reference);
  if (!existing) return null;

  const updated = await updater(existing);
  updated.updated_at = new Date().toISOString();
  await saveBooking(updated);
  return updated;
}

export async function readAdminSettings(): Promise<AdminSettings> {
  await ensureLoaded();
  return adminSettingsCache || defaultAdminSettings();
}

export async function writeAdminSettings(settings: AdminSettings): Promise<AdminSettings> {
  const normalized = normalizeAdminSettings(settings);
  adminSettingsCache = normalized;
  await Promise.all([
    writeSettingsToSupabase(normalized),
    persistJsonFile(settingsPath, normalized),
  ]);
  return normalized;
}

export async function ensureSchema() {
  await ensureLoaded();
}

export { defaultAdminSettings, normalizeAdminSettings };
