export const BOOKINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS bookings (
  reference TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
`;

export const BOOKINGS_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_bookings_created_at
ON bookings(created_at DESC)
`;

export const SETTINGS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const INITIAL_SETTINGS_KEY = "admin_settings";
