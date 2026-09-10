// Money + time formatting helpers used across server and client.

export function formatMyr(cents: number | null | undefined): string {
  const n = Number(cents || 0) / 100;
  return "RM" + n.toFixed(2);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

export function formatTime(hms: string | null | undefined): string {
  if (!hms) return "—";
  // Accept HH:MM, HH:MM:SS, or full ISO
  const s = String(hms);
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return s.slice(0, 5);
  return s;
}

export function generateBookingReference(): string {
  // 6 chars from a 32-char alphabet = ~1B combinations, plenty.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 confusion
  let r = "";
  for (let i = 0; i < 6; i++) {
    r += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `SX-${r}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
