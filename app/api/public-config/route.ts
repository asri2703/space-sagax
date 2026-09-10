// GET /api/public-config
//   Bank details, company info, signature, WhatsApp number.
//   Public read so the booking page can show bank transfer info.

import { getPublicSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPublicSettings();
    return Response.json({
      company_name: settings.company_name,
      bank_name: settings.bank_name,
      bank_account_number: settings.bank_account_number,
      bank_account_name: settings.bank_account_name,
      whatsapp: settings.whatsapp,
      email: settings.email,
      signature_lines: settings.signature_lines,
    });
  } catch (err) {
    console.error("[/api/public-config]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load config" },
      { status: 500 }
    );
  }
}
