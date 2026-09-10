// Email via Resend. We keep the surface minimal so the rest of the
// app doesn't need to care which provider we use.
//
// If RESEND_API_KEY is not set, sendEmail() logs a warning and
// resolves to { ok: false, skipped: true } instead of throwing —
// the admin can still resend invoices manually from the dashboard.

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendResult = { ok: boolean; skipped?: boolean; id?: string; error?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: SendInput): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Saga X Space <bookings@sagaxventures.com>";
  if (!key) {
    console.warn("[email] RESEND_API_KEY not configured; skipping send to", input.to);
    return { ok: false, skipped: true };
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    return { ok: false, error: `${r.status}: ${body}` };
  }
  const data = (await r.json()) as { id: string };
  return { ok: true, id: data.id };
}
