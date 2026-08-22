const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const BOOKINGS_FILE = path.join(ROOT, 'data', 'bookings.json');
const ADMIN_SETTINGS_FILE = path.join(ROOT, 'data', 'admin-settings.json');

loadEnvFile(path.join(ROOT, 'local.env'));

const BASE_PACKAGE_MAP = {
  hour: {
    title: 'Hall 1 Hour',
    amountCents: 6000,
    humanPrice: 'RM60.00',
    copy: 'Best for short meetings or quick sessions.',
  },
  four: {
    title: 'Hall 4 Hour',
    amountCents: 18000,
    humanPrice: 'RM180.00',
    copy: 'Best value for workshops, training, and half-day sessions.',
  },
  full: {
    title: 'Hall Full Day',
    amountCents: 30000,
    humanPrice: 'RM300.00',
    copy: 'Best value for full-day events and training.',
  },
};

const ADMIN_STATUS_VALUES = new Set(['pending_payment', 'pending_review', 'confirmed', 'cancelled']);
const PACKAGE_KEYS = Object.keys(BASE_PACKAGE_MAP);

function formatMyr(amountCents) {
  const value = Number(amountCents || 0) / 100;
  return `RM${value.toFixed(2)}`;
}

function defaultAdminSettings() {
  return {
    package_overrides: {
      hour: null,
      four: null,
      full: null,
    },
  };
}

function mergeAdminSettings(input = {}) {
  const settings = defaultAdminSettings();
  const overrides = input.package_overrides || {};
  for (const key of PACKAGE_KEYS) {
    const override = overrides[key];
    if (!override || typeof override !== 'object') {
      settings.package_overrides[key] = null;
      continue;
    }

    const amountCents = Number(override.amount_cents);
    settings.package_overrides[key] = {
      amount_cents: Number.isFinite(amountCents) && amountCents > 0 ? Math.round(amountCents) : null,
      label: String(override.label || '').trim(),
      updated_at: override.updated_at || new Date().toISOString(),
    };

    if (!settings.package_overrides[key].amount_cents) {
      settings.package_overrides[key] = null;
    }
  }

  return settings;
}

async function readAdminSettings() {
  try {
    const raw = await fsp.readFile(ADMIN_SETTINGS_FILE, 'utf8');
    return mergeAdminSettings(JSON.parse(raw));
  } catch {
    return defaultAdminSettings();
  }
}

async function writeAdminSettings(settings) {
  await fsp.mkdir(path.dirname(ADMIN_SETTINGS_FILE), { recursive: true });
  await fsp.writeFile(ADMIN_SETTINGS_FILE, JSON.stringify(mergeAdminSettings(settings), null, 2));
}

async function getPackageOffer(packageKey) {
  const base = BASE_PACKAGE_MAP[packageKey];
  if (!base) return null;

  const settings = await readAdminSettings();
  const override = settings.package_overrides?.[packageKey];
  const amountCents = override?.amount_cents || base.amountCents;
  const promoLabel = override?.label || '';

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

async function getPublicConfig() {
  const packages = {};
  for (const key of PACKAGE_KEYS) {
    packages[key] = await getPackageOffer(key);
  }

  return {
    site_name: bookingSiteName(),
    company_name: bookingCompanyName(),
    bank_name: bookingBankName(),
    bank_account_name: bookingAccountName(),
    bank_account_number: bookingAccountNumber(),
    whatsapp: bookingWhatsapp(),
    payment_qr_url: process.env.SPACE_BOOKING_PAYMENT_QR_IMAGE || `${appBaseUrl()}/assets/payment-qr.jpg`,
    packages,
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function appBaseUrl() {
  return process.env.BOOKING_PUBLIC_URL || process.env.APP_BASE_URL || `http://localhost:${PORT}`;
}

function bookingSiteName() {
  return process.env.SPACE_BOOKING_SITE_NAME || 'Saga X Space';
}

function bookingCompanyName() {
  return process.env.SPACE_BOOKING_COMPANY_NAME || 'Saga X Ventures';
}

function bookingAccountNumber() {
  return process.env.SPACE_BOOKING_BANK_ACCOUNT_NUMBER || '3440 1065 516';
}

function bookingAccountName() {
  return process.env.SPACE_BOOKING_BANK_ACCOUNT_NAME || bookingCompanyName();
}

function bookingBankName() {
  return process.env.SPACE_BOOKING_BANK_NAME || 'Hong Leong Bank';
}

function bookingWhatsapp() {
  return process.env.SPACE_BOOKING_WHATSAPP_NOTIFY || '60137732703';
}

function resendFromHeader() {
  const fromEmail = process.env.RESEND_FROM_EMAIL || '';
  const fromName = process.env.RESEND_FROM_NAME || bookingCompanyName();
  return fromEmail ? `${fromName} <${fromEmail}>` : '';
}

function billplzApiBase() {
  return process.env.BILLPLZ_API_BASE_URL || 'https://www.billplz.com/api';
}

function billplzAuthHeader() {
  return `Basic ${Buffer.from(`${process.env.BILLPLZ_SECRET_KEY || ''}:`).toString('base64')}`;
}

function billplzFlatten(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => billplzFlatten(item, prefix ? `${prefix}[${index}]` : String(index)));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .flatMap((key) => billplzFlatten(value[key], prefix ? `${prefix}[${key}]` : key));
  }
  return [[prefix, value ?? '']];
}

function billplzSourceString(payload) {
  return Object.keys(payload || {})
    .filter((key) => key !== 'x_signature')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .flatMap((key) => billplzFlatten(payload[key], key))
    .map(([key, value]) => `${key}${value}`)
    .join('|');
}

function verifyBillplzSignature(payload, signature) {
  const xSignatureKey = process.env.BILLPLZ_X_SIGNATURE_KEY;
  if (!xSignatureKey || !signature) return false;
  const source = billplzSourceString(payload);
  const computed = crypto.createHmac('sha256', xSignatureKey).update(source).digest('hex');
  return computed === signature;
}

async function sendResendEmail({ to, subject, html, text } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = resendFromHeader();
  if (!apiKey || !from) {
    return { skipped: true, reason: 'RESEND_API_KEY or sender not configured' };
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((value) => String(value || '').trim()).filter(Boolean);
  if (!recipients.length) return { skipped: true, reason: 'Missing recipient' };
  if (!subject) return { skipped: true, reason: 'Missing subject' };

  const payload = {
    from,
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject,
  };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (process.env.RESEND_REPLY_TO) payload.reply_to = process.env.RESEND_REPLY_TO;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Resend email failed (${response.status})`);
  }

  return { provider: 'resend', id: data?.id || null, to: recipients, subject };
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

function bookingEmailHtml({ booking, paymentUrl, paymentMethod }) {
  const paymentLabel =
    paymentMethod === 'billplz'
      ? 'Billplz FPX'
      : paymentMethod === 'manual'
        ? 'Manual transfer'
        : 'QR payment';

  const paymentSection = paymentUrl
    ? `
      <p><a href="${escapeHtml(paymentUrl)}" style="display:inline-block;padding:12px 18px;background:#2d2cff;color:#fff;border-radius:12px;text-decoration:none;font-weight:700">Continue to Billplz FPX</a></p>
    `
    : `
      <div style="padding:16px;border:1px solid #e5e7eb;border-radius:18px;background:#f8fafc">
        <p style="margin:0 0 8px"><strong>Bank:</strong> ${escapeHtml(bookingBankName())}</p>
        <p style="margin:0 0 8px"><strong>Account name:</strong> ${escapeHtml(bookingAccountName())}</p>
        <p style="margin:0 0 8px"><strong>Account number:</strong> ${escapeHtml(bookingAccountNumber())}</p>
        <p style="margin:0"><strong>QR:</strong> <a href="${escapeHtml(`${appBaseUrl()}/assets/payment-qr.jpg`)}">Open payment QR</a></p>
      </div>
    `;

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b">${escapeHtml(bookingCompanyName())}</p>
        <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;color:#111827">Booking invoice ${escapeHtml(booking.reference)}</h1>
        <p style="margin:0 0 12px;color:#334155">Hi ${escapeHtml(booking.name || 'there')}, your ${escapeHtml(booking.package_title)} booking is now ${escapeHtml(booking.status)}.</p>
        <div style="padding:16px;border:1px solid #e5e7eb;border-radius:18px;background:#f8fafc">
          <p style="margin:0 0 8px"><strong>Venue:</strong> ${escapeHtml(bookingSiteName())}</p>
          <p style="margin:0 0 8px"><strong>Date:</strong> ${escapeHtml(booking.event_date || '')}</p>
          <p style="margin:0 0 8px"><strong>Time:</strong> ${escapeHtml(booking.start_time || '')}</p>
          <p style="margin:0 0 8px"><strong>Payment method:</strong> ${escapeHtml(paymentLabel)}</p>
          <p style="margin:0"><strong>Total:</strong> ${escapeHtml(booking.human_price)}</p>
          <p style="margin:8px 0 0"><strong>Price note:</strong> ${escapeHtml(booking.price_label || 'Default price')}</p>
        </div>
        <div style="margin-top:20px">${paymentSection}</div>
        <p style="margin:24px 0 0;color:#64748b">WhatsApp: ${escapeHtml(bookingWhatsapp())}</p>
      </div>
    </div>
  `;
}

function bookingEmailText({ booking, paymentMethod, paymentUrl }) {
  const lines = [
    `Booking request ${booking.reference}`,
    `Venue: ${bookingSiteName()}`,
    `Package: ${booking.package_title}`,
    `Date: ${booking.event_date || ''}`,
    `Time: ${booking.start_time || ''}`,
    `Payment method: ${paymentMethod}`,
    `Status: ${booking.status}`,
    `Total: ${booking.human_price}`,
    `Price note: ${booking.price_label || 'Default price'}`,
  ];
  if (paymentUrl) lines.push(`Payment URL: ${paymentUrl}`);
  else {
    lines.push(`Bank: ${bookingBankName()}`);
    lines.push(`Account name: ${bookingAccountName()}`);
    lines.push(`Account number: ${bookingAccountNumber()}`);
    lines.push(`QR: ${appBaseUrl()}/assets/payment-qr.jpg`);
  }
  lines.push(`WhatsApp: ${bookingWhatsapp()}`);
  return lines.join('\n');
}

async function sendBookingInvoiceEmail({ booking, paymentUrl = '', paymentMethod, subject, status }) {
  return sendResendEmail({
    to: booking.email,
    subject: subject || `${bookingSiteName()} booking invoice ${booking.reference}`,
    html: bookingEmailHtml({
      booking: status ? { ...booking, status } : booking,
      paymentUrl,
      paymentMethod,
    }),
    text: bookingEmailText({
      booking: status ? { ...booking, status } : booking,
      paymentMethod: paymentMethodLabels(paymentMethod),
      paymentUrl,
    }),
  });
}

async function createBillplzBill(booking) {
  const billplzSecretKey = process.env.BILLPLZ_SECRET_KEY;
  const collectionId = process.env.BILLPLZ_COLLECTION_ID;
  if (!billplzSecretKey || !collectionId) {
    throw new Error('Billplz credentials are not configured');
  }

  const callbackUrl = `${appBaseUrl()}/api/billplz/callback?booking=${encodeURIComponent(booking.reference)}`;
  const redirectUrl = `${appBaseUrl()}/api/billplz/redirect?booking=${encodeURIComponent(booking.reference)}`;
  const body = new URLSearchParams({
    collection_id: collectionId,
    email: booking.email || 'billing@sagaxventures.com',
    name: booking.name || bookingCompanyName(),
    amount: String(booking.amount_cents),
    description: `${bookingSiteName()} - ${booking.package_title}`,
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    reference_1_label: 'Booking',
    reference_1: booking.reference,
    reference_2_label: 'Package',
    reference_2: booking.package_title,
  });

  const response = await fetch(`${billplzApiBase()}/v3/bills`, {
    method: 'POST',
    headers: {
      Authorization: billplzAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'Billplz checkout failed');
  }

  return {
    paymentUrl: data?.url || '',
    billId: data?.id || '',
    raw: data,
  };
}

async function readBookings() {
  try {
    const raw = await fsp.readFile(BOOKINGS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeBookings(bookings) {
  await fsp.mkdir(path.dirname(BOOKINGS_FILE), { recursive: true });
  await fsp.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

async function saveBooking(update) {
  const bookings = await readBookings();
  const index = bookings.findIndex((item) => item.reference === update.reference);
  const next = index === -1 ? [update, ...bookings] : bookings.map((item) => (item.reference === update.reference ? update : item));
  await writeBookings(next);
  return update;
}

async function getBooking(reference) {
  const bookings = await readBookings();
  return bookings.find((item) => item.reference === reference) || null;
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function redirect(res, location, status = 302) {
  res.writeHead(status, { Location: location });
  res.end();
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return '';
  return Buffer.concat(chunks).toString('utf8');
}

async function readBody(req) {
  const raw = await readRawBody(req);
  if (!raw) return {};
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function serveFile(res, filePath) {
  try {
    const data = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

function isBlockedPath(pathname) {
  return pathname.split('/').some((segment) => segment.startsWith('.') && segment !== '' && segment !== '.well-known');
}

async function handleBookingCreate(req, res) {
  const body = await readBody(req);
  const packageKey = String(body.package || 'four');
  const paymentMethod = String(body.payment_method || 'billplz');
  const pkg = await getPackageOffer(packageKey);

  if (!pkg) return sendJson(res, 400, { error: 'Unknown package selected' });
  if (!body.name || !body.email || !body.event_date || !body.start_time) {
    return sendJson(res, 400, { error: 'Please fill in name, email, date, and time' });
  }
  if (!['billplz', 'manual', 'qr'].includes(paymentMethod)) {
    return sendJson(res, 400, { error: 'Unknown payment method' });
  }

  const booking = {
    reference: `SX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim(),
    whatsapp: String(body.whatsapp || '').trim(),
    event_date: String(body.event_date || '').trim(),
    start_time: String(body.start_time || '').trim(),
    pax: Number(body.pax || 0) || null,
    event_type: String(body.event_type || '').trim(),
    notes: String(body.notes || '').trim(),
    package_key: packageKey,
    package_title: pkg.title,
    amount_cents: pkg.amount_cents,
    human_price: pkg.human_price,
    base_amount_cents: pkg.base_amount_cents,
    base_human_price: pkg.base_human_price,
    price_label: pkg.is_promo ? pkg.promo_label || 'Promo price' : 'Default price',
    payment_method: paymentMethod,
    status: paymentMethod === 'billplz' ? 'pending_payment' : 'pending_review',
    created_at: new Date().toISOString(),
  };

  let billplz = null;
  if (paymentMethod === 'billplz') {
    if (!process.env.BILLPLZ_SECRET_KEY || !process.env.BILLPLZ_COLLECTION_ID) {
      return sendJson(res, 503, {
        error: 'Billplz credentials are not configured in local.env',
        booking,
      });
    }

    try {
      billplz = await createBillplzBill(booking);
    } catch (error) {
      return sendJson(res, 502, {
        error: error.message || 'Billplz checkout failed',
        booking,
      });
    }

    booking.billplz_bill_id = billplz.billId;
    booking.payment_url = billplz.paymentUrl;
  }

  await saveBooking(booking);

  let email = { skipped: true, reason: 'Not sent' };
  try {
    email = await sendBookingInvoiceEmail({
      booking,
      paymentUrl: billplz?.paymentUrl || '',
      paymentMethod,
    });
  } catch (err) {
    email = { skipped: false, error: err.message };
  }

  return sendJson(res, 200, {
    booking,
    billplz,
    email,
    payment_url: billplz?.paymentUrl || '',
  });
}

function paymentMethodLabels(method) {
  return method === 'billplz' ? 'Billplz FPX' : method === 'manual' ? 'Manual transfer' : 'QR payment';
}

async function handleBillplzCallback(req, res, url) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const body = await readBody(req);
  const signature = body.x_signature || body['billplz[x_signature]'];
  if (!verifyBillplzSignature(body, signature)) {
    return sendJson(res, 401, { error: 'Invalid Billplz signature' });
  }

  const bookingReference =
    url.searchParams.get('booking') ||
    body.reference_1 ||
    body['billplz[reference_1]'] ||
    body.reference ||
    body['billplz[id]'] ||
    '';

  const paidFlag = String(body['billplz[paid]'] || body['billplz[transaction_status]'] || body.paid || '').toLowerCase();
  const paid = paidFlag === 'true' || paidFlag === '1' || paidFlag === 'paid' || paidFlag === 'verified';

  if (bookingReference) {
    const booking = await getBooking(bookingReference);
    if (booking) {
      booking.status = paid ? 'confirmed' : 'pending_payment';
      booking.billplz_callback = body;
      booking.billplz_paid = paid;
      await saveBooking(booking);

      if (paid && booking.email && process.env.RESEND_API_KEY && resendFromHeader()) {
        try {
          await sendBookingInvoiceEmail({
            booking,
            paymentUrl: booking.payment_url || '',
            paymentMethod: 'billplz',
            subject: `${bookingSiteName()} payment confirmed - ${booking.reference}`,
            status: 'confirmed',
          });
        } catch {
          // Keep callback fast even if the follow-up email fails.
        }
      }
    }
  }

  return sendJson(res, 200, {
    received: true,
    provider: 'billplz',
    status: paid ? 'paid' : 'pending',
  });
}

async function handleBillplzRedirect(req, res, url) {
  const signature = url.searchParams.get('billplz[x_signature]') || url.searchParams.get('x_signature') || '';
  const payload = Object.fromEntries(url.searchParams.entries());
  if (signature && !verifyBillplzSignature(payload, signature)) {
    return sendHtml(
      res,
      401,
      `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Saga X Space - Payment Status</title>
        <style>
          body{font-family:Arial,sans-serif;background:#f6f1e8;color:#191926;margin:0;padding:40px}
          .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px}
        </style>
      </head>
      <body>
        <div class="card">
          <h1 style="margin:0 0 14px;font-size:32px;line-height:1.1">Payment verification failed</h1>
          <p style="line-height:1.7;margin:0">The Billplz redirect signature could not be verified.</p>
        </div>
      </body>
      </html>`
    );
  }

  const bookingReference = url.searchParams.get('booking') || url.searchParams.get('billplz[reference_1]') || '';
  const paidFlag = String(url.searchParams.get('billplz[paid]') || url.searchParams.get('paid') || '').toLowerCase();
  const paid = paidFlag === 'true' || paidFlag === '1' || paidFlag === 'paid' || paidFlag === 'verified';

  if (bookingReference) {
    const booking = await getBooking(bookingReference);
    if (booking) {
      booking.status = paid ? 'confirmed' : 'pending_payment';
      booking.billplz_redirect = Object.fromEntries(url.searchParams.entries());
      booking.billplz_paid = paid;
      await saveBooking(booking);
    }
  }

  const message = paid
    ? 'Payment confirmed. Your booking has been updated.'
    : 'Payment page closed or still pending. We will keep your booking in review.';

  sendHtml(
    res,
    200,
    `<!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Saga X Space - Payment Status</title>
      <style>
        body{font-family:Arial,sans-serif;background:#f6f1e8;color:#191926;margin:0;padding:40px}
        .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px}
        a{color:#2d2cff;font-weight:700;text-decoration:none}
      </style>
    </head>
    <body>
      <div class="card">
        <p style="text-transform:uppercase;letter-spacing:.16em;color:#2d2cff;font-size:12px;margin:0 0 10px">Saga X Space</p>
        <h1 style="margin:0 0 14px;font-size:32px;line-height:1.1">Payment update</h1>
        <p style="line-height:1.7;margin:0 0 18px">${escapeHtml(message)}</p>
        <p style="line-height:1.7;margin:0"><a href="${escapeHtml(appBaseUrl())}">Return to booking page</a></p>
      </div>
    </body>
    </html>`
  );
}

async function handleBookingsList(req, res) {
  const bookings = await readBookings();
  return sendJson(res, 200, { items: bookings });
}

function getAdminKey(req) {
  const headerKey = String(req.headers['x-admin-key'] || '').trim();
  const bearerKey = String(req.headers.authorization || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  return headerKey || bearerKey;
}

function requireAdmin(req, res) {
  const expected = String(process.env.ADMIN_ACCESS_KEY || '').trim();
  if (!expected) {
    sendJson(res, 503, { error: 'ADMIN_ACCESS_KEY is not configured in local.env' });
    return false;
  }

  if (getAdminKey(req) !== expected) {
    sendJson(res, 401, { error: 'Invalid admin access key' });
    return false;
  }

  return true;
}

function bookingWhatsappNumber() {
  return bookingWhatsapp().replace(/\D+/g, '');
}

function buildAdminWhatsappText(booking) {
  const lines = [
    `Saga X booking alert`,
    `Ref: ${booking.reference}`,
    `Name: ${booking.name || ''}`,
    `Package: ${booking.package_title || ''}`,
    `Date: ${booking.event_date || ''}`,
    `Time: ${booking.start_time || ''}`,
    `Amount: ${booking.human_price || ''}`,
    `Payment: ${paymentMethodLabels(booking.payment_method)}`,
    `Status: ${booking.status || ''}`,
  ];

  if (booking.admin_note) lines.push(`Note: ${booking.admin_note}`);
  return lines.join('\n');
}

function buildAdminWhatsappUrl(booking) {
  const number = bookingWhatsappNumber();
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(buildAdminWhatsappText(booking))}`;
}

function normalizeAdminStatus(value) {
  const status = String(value || '').trim();
  return ADMIN_STATUS_VALUES.has(status) ? status : null;
}

async function handlePublicConfig(req, res) {
  return sendJson(res, 200, await getPublicConfig());
}

async function handleAdminConfigGet(req, res) {
  if (!requireAdmin(req, res)) return;
  const [settings, publicConfig] = await Promise.all([readAdminSettings(), getPublicConfig()]);
  return sendJson(res, 200, { settings, public: publicConfig });
}

async function handleAdminConfigPatch(req, res) {
  if (!requireAdmin(req, res)) return;
  const body = await readBody(req);
  const incoming = body.package_overrides || body.packages || {};
  const settings = defaultAdminSettings();

  for (const key of PACKAGE_KEYS) {
    const item = incoming[key];
    if (!item || item === 'reset' || item.reset === true) {
      settings.package_overrides[key] = null;
      continue;
    }

    const amount = Number(item.amount_cents ?? item.amountCents ?? item.price_cents ?? item.priceCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      settings.package_overrides[key] = null;
      continue;
    }

    settings.package_overrides[key] = {
      amount_cents: Math.round(amount),
      label: String(item.label ?? item.price_label ?? '').trim(),
      updated_at: new Date().toISOString(),
    };
  }

  await writeAdminSettings(settings);
  return sendJson(res, 200, { ok: true, settings, public: await getPublicConfig() });
}

async function handleAdminBookingsList(req, res) {
  if (!requireAdmin(req, res)) return;
  const bookings = await readBookings();
  const items = bookings.map((booking) => ({
    ...booking,
    whatsapp_alert_url: buildAdminWhatsappUrl(booking),
    whatsapp_alert_text: buildAdminWhatsappText(booking),
  }));
  return sendJson(res, 200, { items });
}

async function handleAdminBookingPatch(req, res, reference) {
  if (!requireAdmin(req, res)) return;
  const booking = await getBooking(reference);
  if (!booking) return sendJson(res, 404, { error: 'Booking not found' });

  const body = await readBody(req);
  const nextStatus = normalizeAdminStatus(body.status);
  if (body.status && !nextStatus) {
    return sendJson(res, 400, { error: 'Invalid booking status' });
  }

  if (nextStatus) booking.status = nextStatus;

  if (body.reset_price) {
    const baseAmount = Number(booking.base_amount_cents || BASE_PACKAGE_MAP[booking.package_key]?.amountCents || booking.amount_cents || 0);
    booking.amount_cents = Math.round(baseAmount);
    booking.human_price = formatMyr(booking.amount_cents);
    booking.price_label = 'Default price';
    booking.price_source = 'default';
  } else if (body.amount_cents !== undefined || body.amountCents !== undefined) {
    const amount = Number(body.amount_cents ?? body.amountCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { error: 'Invalid amount_cents value' });
    }
    booking.amount_cents = Math.round(amount);
    booking.human_price = formatMyr(booking.amount_cents);
    booking.price_label = String(body.price_label || body.label || 'Custom price').trim();
    booking.price_source = 'admin_override';
  }

  if (body.payment_method) {
    const paymentMethod = String(body.payment_method);
    if (!['billplz', 'manual', 'qr'].includes(paymentMethod)) {
      return sendJson(res, 400, { error: 'Invalid payment method' });
    }
    booking.payment_method = paymentMethod;
  }

  if (body.admin_note !== undefined) {
    booking.admin_note = String(body.admin_note || '').trim();
  }

  booking.updated_at = new Date().toISOString();
  await saveBooking(booking);

  return sendJson(res, 200, {
    booking: {
      ...booking,
      whatsapp_alert_url: buildAdminWhatsappUrl(booking),
      whatsapp_alert_text: buildAdminWhatsappText(booking),
    },
  });
}

async function handleAdminBookingResend(req, res, reference) {
  if (!requireAdmin(req, res)) return;
  const booking = await getBooking(reference);
  if (!booking) return sendJson(res, 404, { error: 'Booking not found' });
  if (!booking.email) return sendJson(res, 400, { error: 'Booking is missing customer email' });

  try {
    const email = await sendBookingInvoiceEmail({
      booking,
      paymentUrl: booking.payment_url || '',
      paymentMethod: booking.payment_method || 'manual',
      subject: `${bookingSiteName()} updated invoice ${booking.reference}`,
    });

    return sendJson(res, 200, { ok: true, email });
  } catch (error) {
    return sendJson(res, 502, { error: error.message || 'Failed to resend invoice' });
  }
}

function parseRouteReference(pathname, prefix) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < prefix + 1) return '';
  return decodeURIComponent(parts[prefix]);
}

async function routeStatic(pathname, res) {
  if (isBlockedPath(pathname)) return false;
  const clean = pathname === '/' ? '/index.html' : pathname === '/admin' || pathname === '/admin/' ? '/admin.html' : pathname;
  const filePath = path.resolve(ROOT, '.' + clean);
  if (!filePath.startsWith(path.resolve(ROOT))) return false;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    await serveFile(res, filePath);
    return true;
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, appBaseUrl());

    if (req.method === 'GET' && url.pathname === '/api/public-config') return handlePublicConfig(req, res);
    if (req.method === 'GET' && url.pathname === '/api/bookings') return handleBookingsList(req, res);
    if (req.method === 'POST' && url.pathname === '/api/bookings') return handleBookingCreate(req, res);
    if (req.method === 'POST' && url.pathname === '/api/billplz/callback') return handleBillplzCallback(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/billplz/redirect') return handleBillplzRedirect(req, res, url);
    if (url.pathname === '/api/admin/settings' && req.method === 'GET') return handleAdminConfigGet(req, res);
    if (url.pathname === '/api/admin/settings' && req.method === 'PATCH') return handleAdminConfigPatch(req, res);
    if (url.pathname === '/api/admin/bookings' && req.method === 'GET') return handleAdminBookingsList(req, res);
    if (url.pathname.startsWith('/api/admin/bookings/') && req.method === 'PATCH') {
      const reference = parseRouteReference(url.pathname, 3);
      return handleAdminBookingPatch(req, res, reference);
    }
    if (url.pathname.startsWith('/api/admin/bookings/') && req.method === 'POST' && url.pathname.endsWith('/resend')) {
      const reference = parseRouteReference(url.pathname, 3);
      return handleAdminBookingResend(req, res, reference);
    }

    const handled = await routeStatic(url.pathname, res);
    if (handled) return;

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message || 'Server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Saga X Space running at ${appBaseUrl()}`);
});
