import {
  BOOKINGS_INDEX_SQL,
  BOOKINGS_TABLE_SQL,
  INITIAL_SETTINGS_KEY,
  SETTINGS_SCHEMA_SQL,
} from "./schema";
import { getRuntimeEnv } from "@/lib/runtime-env";

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

let schemaReady: Promise<void> | null = null;

function getDb() {
  const env = getRuntimeEnv();
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let the control plane inject the real binding values before using the database."
    );
  }

  return env.DB as {
    batch: (statements: Array<{ run: () => Promise<unknown> }>) => Promise<unknown>;
    prepare: (sql: string) => {
      bind: (...values: unknown[]) => {
        run: () => Promise<unknown>;
        first: <T>() => Promise<T | null>;
        all: <T>() => Promise<{ results?: T[] }>;
      };
    };
  };
}

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
  const raw = typeof input === "object" && input && "package_overrides" in input
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

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb();
      await db.batch([
        db.prepare(BOOKINGS_TABLE_SQL).bind(),
        db.prepare(BOOKINGS_INDEX_SQL).bind(),
        db.prepare(SETTINGS_SCHEMA_SQL).bind(),
      ]);
    })();
  }

  await schemaReady;
}

export async function readBookings(): Promise<BookingRecord[]> {
  await ensureSchema();
  const db = getDb();
  const result = await db
    .prepare("SELECT reference, payload, created_at, updated_at FROM bookings ORDER BY created_at DESC")
    .bind()
    .all<{ reference: string; payload: string; created_at: string; updated_at: string }>();

  return (result.results || []).map((row) => ({
    ...(JSON.parse(row.payload) as Record<string, unknown>),
    reference: row.reference,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getBooking(reference: string): Promise<BookingRecord | null> {
  await ensureSchema();
  const db = getDb();
  const result = await db
    .prepare("SELECT reference, payload, created_at, updated_at FROM bookings WHERE reference = ?1 LIMIT 1")
    .bind(reference)
    .first<{ reference: string; payload: string; created_at: string; updated_at: string }>();

  if (!result) return null;

  return {
    ...(JSON.parse(result.payload) as Record<string, unknown>),
    reference: result.reference,
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  await ensureSchema();
  const db = getDb();
  await db
    .prepare(
      `INSERT INTO bookings (reference, payload, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(reference) DO UPDATE SET
         payload = excluded.payload,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      booking.reference,
      JSON.stringify(booking),
      booking.created_at,
      booking.updated_at
    )
    .run();

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
  await ensureSchema();
  const db = getDb();
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?1 LIMIT 1")
    .bind(INITIAL_SETTINGS_KEY)
    .first<{ value: string }>();

  if (!row) return defaultAdminSettings();
  try {
    return normalizeAdminSettings(JSON.parse(row.value));
  } catch {
    return defaultAdminSettings();
  }
}

export async function writeAdminSettings(settings: AdminSettings): Promise<AdminSettings> {
  await ensureSchema();
  const db = getDb();
  const normalized = normalizeAdminSettings(settings);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    )
    .bind(INITIAL_SETTINGS_KEY, JSON.stringify(normalized), now)
    .run();

  return normalized;
}

export { defaultAdminSettings, normalizeAdminSettings, ensureSchema };
