// Billplz payment gateway client.
//
// We call the v3 REST API directly with HMAC-SHA256 signed payloads.
// Reference: https://www.billplz.com/api

import { createHmac } from "node:crypto";

const BASE = (process.env.BILLPLZ_API_BASE_URL || "https://www.billplz.com/api/v3").replace(/\/$/, "");

function getKey(): string {
  return (process.env.BILLPLZ_X_SIGNATURE_KEY || "").trim();
}
function getCollection(): string {
  return (process.env.BILLPLZ_COLLECTION_ID || "").trim();
}
function getSecret(): string {
  return (process.env.BILLPLZ_SECRET_KEY || "").trim();
}

function signPayload(method: "GET" | "POST" | "DELETE" | "PUT", path: string, body: Record<string, string> = {}): string {
  // For POST: sign `path` + sorted body params concatenated with `&`
  // For GET: sign `path` + sorted query params
  let payload = path;
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    const keys = Object.keys(body).sort();
    const pairs = keys.map((k) => `${k}${body[k]}`).join("|");
    if (pairs) payload = payload + pairs;
  }
  return createHmac("sha256", getKey()).update(payload).digest("hex");
}

function authHeader(): string {
  // Basic auth with API secret key as username, empty password
  return "Basic " + Buffer.from(`${getSecret()}:`).toString("base64");
}

export type CreateBillInput = {
  collection_id?: string;
  email?: string;
  mobile?: string;
  name: string;
  amount_cents: number; // in sen (e.g. RM18.00 = 1800)
  callback_url: string;
  description: string;
  reference_1_label?: string;
  reference_1?: string;
  redirect_url?: string;
  deliver?: boolean;
};

export type CreateBillResult = {
  id: string;
  collection_id: string;
  paid: boolean;
  state: "overdue" | "due" | "paid" | "deleted";
  amount: number; // sen
  paid_amount: number;
  name: string;
  email: string | null;
  mobile: string | null;
  description: string;
  reference_1: string | null;
  reference_2: string | null;
  redirect_url: string | null;
  callback_url: string;
  url: string; // bill payment URL
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export function isBillplzConfigured(): boolean {
  return Boolean(getKey() && getCollection() && getSecret());
}

export async function createBill(input: CreateBillInput): Promise<CreateBillResult> {
  if (!isBillplzConfigured()) {
    throw new Error("Billplz is not configured");
  }

  const body: Record<string, string> = {
    collection_id: input.collection_id || getCollection(),
    name: input.name,
    amount: String(input.amount_cents),
    callback_url: input.callback_url,
    description: input.description,
  };
  if (input.email) body.email = input.email;
  if (input.mobile) body.mobile = input.mobile;
  if (input.reference_1_label) body.reference_1_label = input.reference_1_label;
  if (input.reference_1) body.reference_1 = input.reference_1;
  if (input.redirect_url) body.redirect_url = input.redirect_url;
  if (typeof input.deliver === "boolean") body.deliver = input.deliver ? "true" : "false";

  const path = "/bills";
  const signature = signPayload("POST", path, body);
  const url = `${BASE}${path}?${new URLSearchParams({ ...body, signature }).toString()}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Billplz createBill ${r.status}: ${text}`);
  }
  return (await r.json()) as CreateBillResult;
}

export function verifyXSignature(path: string, body: Record<string, string>, signature: string): boolean {
  const expected = signPayload("POST", path, body);
  // timingSafeEqual
  if (expected.length !== signature.length) return false;
  return createHmac("sha256", getKey()).update(path + Object.keys(body).sort().map((k) => `${k}${body[k]}`).join("|")).digest("hex") === expected;
}
