// Pure-JS PDF generator using pdf-lib. No headless browser, no
// bundled Chromium binary — works identically on Vercel serverless
// and on a local dev machine.

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export type InvoiceData = {
  reference: string;
  venue_name: string;
  name: string;
  email?: string;
  whatsapp?: string;
  event_date?: string;
  start_time?: string;
  package_title: string;
  amount_cents: number;
  base_amount_cents: number;
  price_label?: string;
  admin_note?: string;
  status: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  company_name: string;
  signature_lines: string[];
};

const BRAND = rgb(0.039, 0.18, 0.549); // #0a2e8c
const INK = rgb(0.118, 0.161, 0.231); // #1e293b
const MUTED = rgb(0.392, 0.455, 0.545); // #64748b
const BORDER = rgb(0.792, 0.839, 0.886); // #cbd5e1
const BG_CREAM = rgb(1, 0.98, 0.922); // #fffaeb
const STATUS_COLORS: Record<string, ReturnType<typeof rgb>> = {
  confirmed: rgb(0.204, 0.827, 0.6),
  pending_payment: rgb(0.984, 0.749, 0.141),
  pending_review: rgb(0.984, 0.749, 0.141),
  cancelled: rgb(0.957, 0.247, 0.369),
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  pending_payment: "Pending payment",
  pending_review: "Pending review",
  cancelled: "Cancelled",
};

function formatMyr(cents: number): string {
  return "RM" + (Number(cents || 0) / 100).toFixed(2);
}
function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}
function text(
  page: PDFPage,
  str: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
  align: "left" | "right" | "center" = "left"
) {
  let drawX = x;
  if (align !== "left") {
    const w = font.widthOfTextAtSize(str, size);
    drawX = align === "right" ? x - w : x - w / 2;
  }
  page.drawText(str, { x: drawX, y, size, font, color });
}

function drawSagaXMark(page: PDFPage, x: number, y: number, scale: number, color = BRAND) {
  // Diagonal "sword" line through the mark
  page.drawLine({ start: { x, y }, end: { x: x + 90 * scale, y: y - 21 * scale }, color, thickness: 0.5 * scale });
  // Outlined X
  const cx = x + 18 * scale;
  const cy = y - 15 * scale;
  const r = 13 * scale;
  page.drawLine({ start: { x: cx - r, y: cy + r }, end: { x: cx + r, y: cy - r }, color, thickness: 2 * scale });
  page.drawLine({ start: { x: cx + r, y: cy + r }, end: { x: cx - r, y: cy - r }, color, thickness: 2 * scale });
  // Inner solid X (approximated as a small rotated square)
  const ir = 5 * scale;
  const angle = Math.PI / 4;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let dx = -ir; dx <= ir; dx += 0.4 * scale) {
    const len = ir - Math.abs(dx);
    if (len <= 0) continue;
    page.drawLine({
      start: { x: cx + dx * c - len * s, y: cy + dx * s + len * c },
      end: { x: cx + dx * c + len * s, y: cy + dx * s - len * c },
      color,
      thickness: 0.6 * scale,
    });
  }
  return 105 * scale;
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${data.reference}`);
  doc.setAuthor(data.company_name);
  doc.setCreator(`${data.company_name} admin`);

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 portrait: 595.28 x 841.89 points
  const W = 595.28;
  const H = 841.89;
  const page = doc.addPage([W, H]);
  const left = 50;
  const right = W - 50;
  const contentW = right - left;

  // ── Header ─────────────────────────────────────────────
  const markW = drawSagaXMark(page, left, H - 60, 1.0);
  text(page, "SAGA-X", left + markW, H - 78, helvBold, 14, BRAND);

  // Right: company + "Invoice"
  text(page, data.company_name.toUpperCase(), right, H - 60, helvBold, 7, MUTED, "right");
  text(page, "Invoice", right, H - 82, helvBold, 26, INK, "right");

  // Meta row
  const metaY = H - 110;
  const colW = (contentW - 20) / 3;
  text(page, "REFERENCE", right, metaY, helvBold, 7, MUTED, "right");
  text(page, "ISSUED", right - colW, metaY, helvBold, 7, MUTED, "right");
  text(page, "STATUS", right - colW * 2, metaY, helvBold, 7, MUTED, "right");

  text(page, data.reference, right, metaY - 14, helvBold, 10, INK, "right");
  text(page, formatDate(new Date().toISOString().slice(0, 10)), right - colW, metaY - 14, helv, 10, INK, "right");

  // Status pill
  const statusText = STATUS_LABEL[data.status] || data.status || "—";
  const statusW = helvBold.widthOfTextAtSize(statusText, 8) + 14;
  const statusX = right - colW * 2 - statusW + 4;
  const statusY = metaY - 20;
  const statusColor = STATUS_COLORS[data.status] || MUTED;
  page.drawRectangle({ x: statusX, y: statusY, width: statusW, height: 14, color: statusColor, borderColor: INK, borderWidth: 0.5 });
  text(page, statusText, statusX + statusW / 2, statusY + 4, helvBold, 8, INK, "center");

  // Dashed separator
  const sepY = metaY - 30;
  for (let x = left; x < right; x += 6) {
    page.drawLine({ start: { x, y: sepY }, end: { x: x + 3, y: sepY }, color: BORDER, thickness: 0.5 });
  }

  // ── From / To ─────────────────────────────────────────
  let y = sepY - 24;
  const halfW = (contentW - 20) / 2;
  text(page, "FROM", left, y, helvBold, 7, BRAND);
  text(page, data.company_name, left, y - 14, helvBold, 11, INK);
  text(page, data.venue_name, left, y - 26, helv, 9, MUTED);
  if (data.bank_name) {
    const bank = `Bank: ${data.bank_name}${data.bank_account_number ? ` (${data.bank_account_number})` : ""}${data.bank_account_name ? ` — ${data.bank_account_name}` : ""}`;
    text(page, bank, left, y - 40, helv, 9, INK);
  }

  const toX = left + halfW + 20;
  text(page, "TO", toX, y, helvBold, 7, BRAND);
  text(page, data.name || "—", toX, y - 14, helvBold, 11, INK);
  if (data.email) text(page, data.email, toX, y - 26, helv, 9, MUTED);
  if (data.whatsapp) text(page, data.whatsapp, toX, y - 38, helv, 9, MUTED);

  y -= 60;

  // ── Event band ────────────────────────────────────────
  const bandH = 50;
  page.drawRectangle({ x: left, y: y - bandH, width: contentW, height: bandH, color: BG_CREAM, borderColor: INK, borderWidth: 0.6 });
  const eventColW = contentW / 3;
  const drawMeta = (label: string, value: string, x: number) => {
    text(page, label.toUpperCase(), x + 12, y - 14, helvBold, 7, MUTED);
    text(page, value, x + 12, y - 30, helvBold, 10, INK);
  };
  drawMeta("Event date", formatDate(data.event_date), left);
  drawMeta("Start time", data.start_time || "—", left + eventColW);
  drawMeta("Venue", data.venue_name, left + eventColW * 2);
  y -= bandH + 18;

  // ── Line items table ─────────────────────────────────
  const tableX = left;
  const tableW = contentW;
  const rowH = 30;
  const amtColW = 100;

  page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: INK });
  text(page, "DESCRIPTION", tableX + 8, y - 14, helvBold, 8, rgb(1, 1, 1));
  text(page, "AMOUNT (MYR)", right - 8, y - 14, helvBold, 8, rgb(1, 1, 1), "right");
  y -= rowH;

  const baseAmount = Number(data.base_amount_cents || data.amount_cents || 0);
  const customAmount = Number(data.amount_cents || 0);
  const hasOverride = customAmount !== baseAmount;

  page.drawLine({ start: { x: tableX, y }, end: { x: right, y }, color: BORDER, thickness: 0.4 });
  text(page, data.package_title || "Hall booking", tableX + 8, y - 13, helvBold, 10, INK);
  text(page, `Base price · ${formatDate(data.event_date)} · ${data.start_time || ""}`, tableX + 8, y - 24, helv, 8, MUTED);
  if (hasOverride) {
    text(page, formatMyr(baseAmount), right - 8, y - 18, helv, 10, MUTED, "right");
    const tw = helv.widthOfTextAtSize(formatMyr(baseAmount), 10);
    page.drawLine({ start: { x: right - 8 - tw, y: y - 14 }, end: { x: right - 8, y: y - 14 }, color: MUTED, thickness: 0.5 });
  } else {
    text(page, formatMyr(baseAmount), right - 8, y - 18, helv, 10, INK, "right");
  }
  y -= rowH;

  if (hasOverride) {
    page.drawLine({ start: { x: tableX, y }, end: { x: right, y }, color: BORDER, thickness: 0.4 });
    text(page, `Custom pricing${data.price_label ? `  •  ${data.price_label}` : ""}`, tableX + 8, y - 13, helvBold, 10, INK);
    text(page, "Adjusted for this booking.", tableX + 8, y - 24, helv, 8, MUTED);
    text(page, formatMyr(customAmount), right - 8, y - 18, helv, 10, INK, "right");
    y -= rowH;
  }

  page.drawLine({ start: { x: tableX, y }, end: { x: right, y }, color: INK, thickness: 0.8 });
  page.drawRectangle({ x: tableX, y: y - rowH, width: tableW, height: rowH, color: BG_CREAM });
  text(page, "TOTAL DUE", right - 110, y - 20, helvBold, 9, INK, "right");
  text(page, formatMyr(customAmount), right - 8, y - 20, helvBold, 14, BRAND, "right");
  y -= rowH + 14;

  // ── Note ─────────────────────────────────────────────
  if (data.admin_note) {
    const noteLines = data.admin_note.match(/.{1,70}(\s|$)/g) || [data.admin_note];
    const noteH = 18 + noteLines.length * 12;
    page.drawRectangle({ x: left, y: y - noteH, width: contentW, height: noteH, color: rgb(1, 0.969, 0.929), borderColor: BORDER, borderWidth: 0.4, borderDashArray: [3, 2] });
    text(page, "NOTE", left + 10, y - 12, helvBold, 7, BRAND);
    let ny = y - 26;
    for (const ln of noteLines.slice(0, 4)) {
      text(page, ln.trim(), left + 10, ny, helv, 9, INK);
      ny -= 12;
    }
    y -= noteH + 20;
  }

  // ── Footer ───────────────────────────────────────────
  const footY = 60;
  for (let x = left; x < right; x += 6) {
    page.drawLine({ start: { x, y: footY + 28 }, end: { x: x + 3, y: footY + 28 }, color: BORDER, thickness: 0.5 });
  }
  text(page, "Thank you for booking with us. Please quote the reference number when contacting us.", W / 2, footY + 16, helv, 9, MUTED, "center");
  const sigLine = data.signature_lines.join(" · ");
  text(page, sigLine, W / 2, footY + 4, helvBold, 9, INK, "center");

  return await doc.save();
}
