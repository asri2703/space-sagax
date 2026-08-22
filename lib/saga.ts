import { createHmac, randomBytes } from "node:crypto";
import {
  getBooking,
  readAdminSettings,
  readBookings,
  saveBooking,
  updateBooking,
  writeAdminSettings,
  type AdminPackageOverride,
  type AdminSettings,
  type BookingRecord,
} from "../db";
import { getRuntimeEnvValue } from "@/lib/runtime-env";

const BASE_PACKAGE_MAP = {
  hour: {
    title: "Hall 1 Hour",
    amountCents: 6000,
    humanPrice: "RM60.00",
    copy: "Best for short meetings or quick sessions.",
  },
  four: {
    title: "Hall 4 Hour",
    amountCents: 18000,
    humanPrice: "RM180.00",
    copy: "Best value for workshops, training, and half-day sessions.",
  },
  full: {
    title: "Hall Full Day",
    amountCents: 30000,
    humanPrice: "RM300.00",
    copy: "Best value for full-day events and training.",
  },
} as const;

const PACKAGE_KEYS = Object.keys(BASE_PACKAGE_MAP) as Array<keyof typeof BASE_PACKAGE_MAP>;
const ADMIN_STATUS_VALUES = new Set(["pending_payment", "pending_review", "confirmed", "cancelled"]);

type PaymentMethod = "billplz" | "manual" | "qr";

type BookingInput = {
  name?: string;
  email?: string;
  whatsapp?: string;
  event_date?: string;
  start_time?: string;
  package?: string;
  payment_method?: PaymentMethod | string;
  pax?: number | string;
  event_type?: string;
  notes?: string;
};

type PackageOffer = {
  key: string;
  title: string;
  copy: string;
  base_amount_cents: number;
  base_human_price: string;
  amount_cents: number;
  human_price: string;
  promo_label: string;
  is_promo: boolean;
};

type PublicConfig = {
  site_name: string;
  company_name: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp: string;
  payment_qr_url: string;
  packages: Record<string, PackageOffer>;
};

type CreateBookingResult = {
  booking: BookingRecord;
  billplz: null | { paymentUrl: string; billId: string; raw: unknown };
  email: Record<string, unknown>;
  payment_url: string;
};

function appEnv(name: string, fallback = "") {
  return getRuntimeEnvValue(name, fallback);
}

export function bookingSiteName() {
  return appEnv("SPACE_BOOKING_SITE_NAME", "Saga X Space");
}

export function bookingCompanyName() {
  return appEnv("SPACE_BOOKING_COMPANY_NAME", "Saga X Ventures");
}

export function bookingAccountNumber() {
  return appEnv("SPACE_BOOKING_BANK_ACCOUNT_NUMBER", "3440 1065 516");
}

export function bookingAccountName() {
  return appEnv("SPACE_BOOKING_BANK_ACCOUNT_NAME", bookingCompanyName());
}

export function bookingBankName() {
  return appEnv("SPACE_BOOKING_BANK_NAME", "Hong Leong Bank");
}

export function bookingWhatsapp() {
  return appEnv("SPACE_BOOKING_WHATSAPP_NOTIFY", "60137732703");
}

export function bookingWhatsappNumber() {
  return bookingWhatsapp().replace(/\D+/g, "");
}

export function appBaseUrl() {
  return (
    appEnv("BOOKING_PUBLIC_URL") ||
    appEnv("APP_BASE_URL", "http://localhost:3000")
  );
}

export function resendFromHeader() {
  const fromEmail = appEnv("RESEND_FROM_EMAIL");
  const fromName = appEnv("RESEND_FROM_NAME", bookingCompanyName());
  return fromEmail ? `${fromName} <${fromEmail}>` : "";
}

export function paymentMethodLabels(method: PaymentMethod | string) {
  return method === "billplz"
    ? "Billplz FPX"
    : method === "manual"
      ? "Manual transfer"
      : "QR payment";
}

function formatMyr(amountCents: number) {
  return `RM${(Number(amountCents || 0) / 100).toFixed(2)}`;
}

function defaultSettings(): AdminSettings {
  return {
    package_overrides: {
      hour: null,
      four: null,
      full: null,
    },
  };
}

function normalizeSettings(input: AdminSettings | null | undefined): AdminSettings {
  const fallback = defaultSettings();
  if (!input) return fallback;
  return {
    package_overrides: {
      hour: input.package_overrides.hour || null,
      four: input.package_overrides.four || null,
      full: input.package_overrides.full || null,
    },
  };
}

export async function getPackageOffer(packageKey: string): Promise<PackageOffer | null> {
  const base = BASE_PACKAGE_MAP[packageKey as keyof typeof BASE_PACKAGE_MAP];
  if (!base) return null;

  const settings = normalizeSettings(await readAdminSettings());
  const override = settings.package_overrides[packageKey as keyof typeof settings.package_overrides];
  const amountCents = override?.amount_cents || base.amountCents;
  const promoLabel = override?.label || "";

  return {
    key: packageKey,
    title: base.title,
    copy: base.copy,
    base_amount_cents: base.amountCents,
    base_human_price: base.humanPrice,
    amount_cents: amountCents,
    human_price: formatMyr(amountCents),
    promo_label: promoLabel,
    is_promo: amountCents !== base.amountCents || Boolean(promoLabel),
  };
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const packages: Record<string, PackageOffer> = {};
  for (const key of PACKAGE_KEYS) {
    packages[key] = (await getPackageOffer(key))!;
  }

  return {
    site_name: bookingSiteName(),
    company_name: bookingCompanyName(),
    bank_name: bookingBankName(),
    bank_account_name: bookingAccountName(),
    bank_account_number: bookingAccountNumber(),
    whatsapp: bookingWhatsapp(),
    payment_qr_url: appEnv("SPACE_BOOKING_PAYMENT_QR_IMAGE") || `${appBaseUrl()}/assets/payment-qr.png`,
    packages,
  };
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return char;
    }
  });
}

export function bookingEmailHtml({
  booking,
  paymentUrl,
  paymentMethod,
}: {
  booking: BookingRecord;
  paymentUrl: string;
  paymentMethod: PaymentMethod | string;
}) {
  const paymentLabel = paymentMethodLabels(paymentMethod);

  const paymentSection = paymentUrl
    ? `<p><a href="${escapeHtml(paymentUrl)}" style="display:inline-block;padding:12px 18px;background:#2d2cff;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Continue to Billplz FPX</a></p>`
    : `<div style="padding:16px;border:1px solid #e5e7eb;border-radius:18px;background:#f8fafc">
        <p style="margin:0 0 8px"><strong>Bank:</strong> ${escapeHtml(bookingBankName())}</p>
        <p style="margin:0 0 8px"><strong>Account name:</strong> ${escapeHtml(bookingAccountName())}</p>
        <p style="margin:0 0 8px"><strong>Account number:</strong> ${escapeHtml(bookingAccountNumber())}</p>
        <p style="margin:0"><strong>QR:</strong> <a href="${escapeHtml(`${appBaseUrl()}/assets/payment-qr.png`)}">Open payment QR</a></p>
      </div>`;

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b">${escapeHtml(bookingCompanyName())}</p>
        <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;color:#111827">Booking invoice ${escapeHtml(booking.reference)}</h1>
        <p style="margin:0 0 12px;color:#334155">Hi ${escapeHtml(String(booking.name || "there"))}, your ${escapeHtml(String(booking.package_title || ""))} booking is now ${escapeHtml(String(booking.status || ""))}.</p>
        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:18px;background:#f8fafc">
          <p style="margin:0 0 8px"><strong>Venue:</strong> ${escapeHtml(bookingSiteName())}</p>
          <p style="margin:0 0 8px"><strong>Date:</strong> ${escapeHtml(String(booking.event_date || ""))}</p>
          <p style="margin:0 0 8px"><strong>Time:</strong> ${escapeHtml(String(booking.start_time || ""))}</p>
          <p style="margin:0 0 8px"><strong>Payment method:</strong> ${escapeHtml(paymentLabel)}</p>
          <p style="margin:0"><strong>Total:</strong> ${escapeHtml(String(booking.human_price || ""))}</p>
          <p style="margin:8px 0 0"><strong>Price note:</strong> ${escapeHtml(String(booking.price_label || "Default price"))}</p>
        </div>
        <div style="margin-top:20px">${paymentSection}</div>
        <p style="margin:24px 0 0;color:#64748b">WhatsApp: ${escapeHtml(bookingWhatsapp())}</p>
      </div>
    </div>
  `;
}

export function bookingEmailText({
  booking,
  paymentMethod,
  paymentUrl,
}: {
  booking: BookingRecord;
  paymentMethod: PaymentMethod | string;
  paymentUrl: string;
}) {
  const lines = [
    `Booking request ${booking.reference}`,
    `Venue: ${bookingSiteName()}`,
    `Package: ${String(booking.package_title || "")}`,
    `Date: ${String(booking.event_date || "")}`,
    `Time: ${String(booking.start_time || "")}`,
    `Payment method: ${paymentMethodLabels(paymentMethod)}`,
    `Status: ${String(booking.status || "")}`,
    `Total: ${String(booking.human_price || "")}`,
    `Price note: ${String(booking.price_label || "Default price")}`,
  ];
  if (paymentUrl) lines.push(`Payment URL: ${paymentUrl}`);
  else {
    lines.push(`Bank: ${bookingBankName()}`);
    lines.push(`Account name: ${bookingAccountName()}`);
    lines.push(`Account number: ${bookingAccountNumber()}`);
    lines.push(`QR: ${appBaseUrl()}/assets/payment-qr.png`);
  }
  lines.push(`WhatsApp: ${bookingWhatsapp()}`);
  return lines.join("\n");
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const apiKey = appEnv("RESEND_API_KEY");
  const from = resendFromHeader();
  if (!apiKey || !from) {
    return { skipped: true, reason: "RESEND_API_KEY or sender not configured" };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (!recipients.length) return { skipped: true, reason: "Missing recipient" };
  if (!subject) return { skipped: true, reason: "Missing subject" };

  const payload: Record<string, unknown> = {
    from,
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (appEnv("RESEND_REPLY_TO")) payload.reply_to = appEnv("RESEND_REPLY_TO");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend email failed (${response.status})`);
  }

  return { provider: "resend", id: data?.id || null, to: recipients, subject };
}

export async function createBillplzBill(booking: BookingRecord) {
  const billplzSecretKey = appEnv("BILLPLZ_SECRET_KEY");
  const collectionId = appEnv("BILLPLZ_COLLECTION_ID");
  if (!billplzSecretKey || !collectionId) {
    throw new Error("Billplz credentials are not configured");
  }

  const callbackUrl = `${appBaseUrl()}/api/billplz/callback?booking=${encodeURIComponent(booking.reference)}`;
  const redirectUrl = `${appBaseUrl()}/api/billplz/redirect?booking=${encodeURIComponent(booking.reference)}`;
  const body = new URLSearchParams({
    collection_id: collectionId,
    email: String(booking.email || "billing@sagaxventures.com"),
    name: String(booking.name || bookingCompanyName()),
    amount: String(booking.amount_cents),
    description: `${bookingSiteName()} - ${String(booking.package_title || "")}`,
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    reference_1_label: "Booking",
    reference_1: booking.reference,
    reference_2_label: "Package",
    reference_2: String(booking.package_title || ""),
  });

  const response = await fetch(`${appEnv("BILLPLZ_API_BASE_URL", "https://www.billplz.com/api")}/v3/bills`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${billplzSecretKey}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || "Billplz checkout failed");
  }

  return {
    paymentUrl: data?.url || "",
    billId: data?.id || "",
    raw: data,
  };
}

function verifyBillplzSignature(payload: Record<string, unknown>, signature: string) {
  const xSignatureKey = appEnv("BILLPLZ_X_SIGNATURE_KEY");
  if (!xSignatureKey || !signature) return false;

  const entries = Object.entries(payload)
    .filter(([key]) => key !== "x_signature")
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const flatten = (value: unknown, prefix = ""): Array<[string, unknown]> => {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => flatten(item, prefix ? `${prefix}[${index}]` : String(index)));
    }
    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .flatMap((key) => flatten((value as Record<string, unknown>)[key], prefix ? `${prefix}[${key}]` : key));
    }
    return [[prefix, value ?? ""]];
  };

  const source = entries
    .flatMap(([key, value]) => flatten(value, key))
    .map(([key, value]) => `${key}${String(value ?? "")}`)
    .join("|");

  const computed = createHmac("sha256", xSignatureKey).update(source).digest("hex");
  return computed === signature;
}

export function paymentMethodForBody(value: unknown): PaymentMethod {
  return value === "manual" || value === "qr" ? value : "billplz";
}

export async function createBookingFromInput(body: BookingInput): Promise<CreateBookingResult> {
  const packageKey = String(body.package || "four");
  const paymentMethod = paymentMethodForBody(body.payment_method);
  const pkg = await getPackageOffer(packageKey);
  if (!pkg) {
    throw new Error("Unknown package selected");
  }
  if (!body.name || !body.email || !body.event_date || !body.start_time) {
    throw new Error("Please fill in name, email, date, and time");
  }

  const booking: BookingRecord = {
    reference: `SX-${randomBytes(3).toString("hex").toUpperCase()}`,
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim(),
    whatsapp: String(body.whatsapp || "").trim(),
    event_date: String(body.event_date || "").trim(),
    start_time: String(body.start_time || "").trim(),
    pax: Number(body.pax || 0) || null,
    event_type: String(body.event_type || "").trim(),
    notes: String(body.notes || "").trim(),
    package_key: packageKey,
    package_title: pkg.title,
    amount_cents: pkg.amount_cents,
    human_price: pkg.human_price,
    base_amount_cents: pkg.base_amount_cents,
    base_human_price: pkg.base_human_price,
    price_label: pkg.is_promo ? pkg.promo_label || "Promo price" : "Default price",
    payment_method: paymentMethod,
    status: paymentMethod === "billplz" ? "pending_payment" : "pending_review",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let billplz: CreateBookingResult["billplz"] = null;
  if (paymentMethod === "billplz") {
    if (!appEnv("BILLPLZ_SECRET_KEY") || !appEnv("BILLPLZ_COLLECTION_ID")) {
      throw new Error("Billplz credentials are not configured in local.env");
    }

    const created = await createBillplzBill(booking);
    billplz = created;
    booking.billplz_bill_id = created.billId;
    booking.payment_url = created.paymentUrl;
  }

  await saveBooking(booking);

  let email: Record<string, unknown> = { skipped: true, reason: "Not sent" };
  try {
    email = await sendResendEmail({
      to: booking.email as string,
      subject: `${bookingSiteName()} booking invoice ${booking.reference}`,
      html: bookingEmailHtml({
        booking,
        paymentUrl: billplz?.paymentUrl || "",
        paymentMethod,
      }),
      text: bookingEmailText({
        booking,
        paymentMethod,
        paymentUrl: billplz?.paymentUrl || "",
      }),
    });
  } catch (error) {
    email = { skipped: false, error: error instanceof Error ? error.message : "Email failed" };
  }

  return {
    booking,
    billplz,
    email,
    payment_url: billplz?.paymentUrl || "",
  };
}

export async function updateAdminSettingsFromInput(body: {
  package_overrides?: Record<string, { amount_cents?: number; label?: string } | null>;
  packages?: Record<string, { amount_cents?: number; label?: string } | null>;
}) {
  const incoming = body.package_overrides || body.packages || {};
  const current = normalizeSettings(await readAdminSettings());

  for (const key of PACKAGE_KEYS) {
    const item = incoming[key as string];
    if (!item) {
      current.package_overrides[key] = null;
      continue;
    }

    const amount = Number(item.amount_cents);
    if (!Number.isFinite(amount) || amount <= 0) {
      current.package_overrides[key] = null;
      continue;
    }

    current.package_overrides[key] = {
      amount_cents: Math.round(amount),
      label: String(item.label || "").trim(),
      updated_at: new Date().toISOString(),
    };
  }

  return writeAdminSettings(current);
}

export async function listBookingsForAdmin() {
  const bookings = await readBookings();
  return bookings.map((booking) => ({
    ...booking,
    whatsapp_alert_url: buildAdminWhatsappUrl(booking),
    whatsapp_alert_text: buildAdminWhatsappText(booking),
  }));
}

export function buildAdminWhatsappText(booking: BookingRecord) {
  const lines = [
    `Saga X booking alert`,
    `Ref: ${String(booking.reference || "")}`,
    `Name: ${String(booking.name || "")}`,
    `Package: ${String(booking.package_title || "")}`,
    `Date: ${String(booking.event_date || "")}`,
    `Time: ${String(booking.start_time || "")}`,
    `Amount: ${String(booking.human_price || "")}`,
    `Payment: ${paymentMethodLabels(String(booking.payment_method || ""))}`,
    `Status: ${String(booking.status || "")}`,
  ];

  if (booking.admin_note) lines.push(`Note: ${String(booking.admin_note)}`);
  return lines.join("\n");
}

export function buildAdminWhatsappUrl(booking: BookingRecord) {
  const number = bookingWhatsappNumber();
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(buildAdminWhatsappText(booking))}`;
}

function normalizeAdminStatus(value: unknown) {
  const status = String(value || "").trim();
  return ADMIN_STATUS_VALUES.has(status) ? status : null;
}

export async function patchAdminBooking(
  reference: string,
  body: {
    status?: string;
    amount_cents?: number;
    amountCents?: number;
    price_label?: string;
    label?: string;
    admin_note?: string;
    payment_method?: string;
    reset_price?: boolean;
  }
) {
  const nextStatus = normalizeAdminStatus(body.status);
  if (body.status && !nextStatus) {
    throw new Error("Invalid booking status");
  }

  const updated = await updateBooking(reference, (booking) => {
    if (nextStatus) booking.status = nextStatus;

    if (body.reset_price) {
      const baseAmount = Number(
        booking.base_amount_cents || BASE_PACKAGE_MAP[String(booking.package_key || "four") as keyof typeof BASE_PACKAGE_MAP]?.amountCents || booking.amount_cents || 0
      );
      const nextAmount = Math.round(baseAmount);
      booking.amount_cents = nextAmount;
      booking.human_price = formatMyr(nextAmount);
      booking.price_label = "Default price";
      booking.price_source = "default";
    } else if (body.amount_cents !== undefined || body.amountCents !== undefined) {
      const amount = Number(body.amount_cents ?? body.amountCents);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid amount_cents value");
      }
      const nextAmount = Math.round(amount);
      booking.amount_cents = nextAmount;
      booking.human_price = formatMyr(nextAmount);
      booking.price_label = String(body.price_label || body.label || "Custom price").trim();
      booking.price_source = "admin_override";
    }

    if (body.payment_method) {
      const paymentMethod = paymentMethodForBody(body.payment_method);
      if (!["billplz", "manual", "qr"].includes(paymentMethod)) {
        throw new Error("Invalid payment method");
      }
      booking.payment_method = paymentMethod;
    }

    if (body.admin_note !== undefined) {
      booking.admin_note = String(body.admin_note || "").trim();
    }

    return booking;
  });

  if (!updated) throw new Error("Booking not found");
  return {
    ...updated,
    whatsapp_alert_url: buildAdminWhatsappUrl(updated),
    whatsapp_alert_text: buildAdminWhatsappText(updated),
  };
}

export async function resendAdminBooking(reference: string) {
  const booking = await getBooking(reference);
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (!booking.email) {
    throw new Error("Booking is missing customer email");
  }

  const email = await sendResendEmail({
    to: String(booking.email),
    subject: `${bookingSiteName()} updated invoice ${booking.reference}`,
    html: bookingEmailHtml({
      booking,
      paymentUrl: String(booking.payment_url || ""),
      paymentMethod: String(booking.payment_method || "manual"),
    }),
    text: bookingEmailText({
      booking,
      paymentMethod: String(booking.payment_method || "manual"),
      paymentUrl: String(booking.payment_url || ""),
    }),
  });

  return { ok: true, email };
}

export async function handleBillplzCallbackPayload(
  url: URL,
  body: Record<string, unknown>
) {
  const signature = String(body.x_signature || body["billplz[x_signature]"] || "");
  if (!verifyBillplzSignature(body, signature)) {
    throw new Error("Invalid Billplz signature");
  }

  const bookingReference =
    url.searchParams.get("booking") ||
    String(body.reference_1 || body["billplz[reference_1]"] || body.reference || body["billplz[id]"] || "");

  const paidFlag = String(body["billplz[paid]"] || body["billplz[transaction_status]"] || body.paid || "").toLowerCase();
  const paid = paidFlag === "true" || paidFlag === "1" || paidFlag === "paid" || paidFlag === "verified";

  if (bookingReference) {
    await updateBooking(bookingReference, (booking) => {
      booking.status = paid ? "confirmed" : "pending_payment";
      booking.billplz_callback = body;
      booking.billplz_paid = paid;
      return booking;
    });

    const booking = await getBooking(bookingReference);
    if (paid && booking?.email && appEnv("RESEND_API_KEY") && resendFromHeader()) {
      try {
        await sendResendEmail({
          to: String(booking.email),
          subject: `${bookingSiteName()} payment confirmed - ${booking.reference}`,
          html: bookingEmailHtml({
            booking: { ...booking, status: "confirmed" },
            paymentMethod: "billplz",
            paymentUrl: String(booking.payment_url || ""),
          }),
          text: bookingEmailText({
            booking: { ...booking, status: "confirmed" },
            paymentMethod: "billplz",
            paymentUrl: String(booking.payment_url || ""),
          }),
        });
      } catch {
        // Keep callback fast.
      }
    }
  }

  return {
    received: true,
    provider: "billplz",
    status: paid ? "paid" : "pending",
  };
}

export async function handleBillplzRedirectPayload(url: URL) {
  const signature = url.searchParams.get("billplz[x_signature]") || url.searchParams.get("x_signature") || "";
  const payload = Object.fromEntries(url.searchParams.entries());
  if (signature && !verifyBillplzSignature(payload, signature)) {
    return {
      ok: false,
      paid: false,
      message: "The Billplz redirect signature could not be verified.",
    };
  }

  const bookingReference = url.searchParams.get("booking") || url.searchParams.get("billplz[reference_1]") || "";
  const paidFlag = String(url.searchParams.get("billplz[paid]") || url.searchParams.get("paid") || "").toLowerCase();
  const paid = paidFlag === "true" || paidFlag === "1" || paidFlag === "paid" || paidFlag === "verified";

  if (bookingReference) {
    await updateBooking(bookingReference, (booking) => {
      booking.status = paid ? "confirmed" : "pending_payment";
      booking.billplz_redirect = Object.fromEntries(url.searchParams.entries());
      booking.billplz_paid = paid;
      return booking;
    });
  }

  return {
    ok: true,
    paid,
    message: paid
      ? "Payment confirmed. Your booking has been updated."
      : "Payment page closed or still pending. We will keep your booking in review.",
  };
}

export {
  readBookings,
  getBooking,
  saveBooking,
  readAdminSettings,
  writeAdminSettings,
  defaultSettings as defaultAdminSettings,
};
