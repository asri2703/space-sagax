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
    // Vercel deployments can be read-only. Keep the request alive even when
    // persistence is unavailable.
  }
}

async function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      bookingsCache = await readJsonFile<BookingRecord[]>(bookingsPath, []);
      adminSettingsCache = normalizeAdminSettings(
        await readJsonFile<AdminSettings>(settingsPath, defaultAdminSettings())
      );
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
  await persistJsonFile(bookingsPath, bookingsCache);

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
  await persistJsonFile(settingsPath, normalized);

  return normalized;
}

export async function ensureSchema() {
  await ensureLoaded();
}

export { defaultAdminSettings, normalizeAdminSettings };
