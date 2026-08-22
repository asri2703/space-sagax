import { handleBillplzCallbackPayload } from "@/lib/saga";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, unknown> = {};
    if (contentType.includes("application/x-www-form-urlencoded")) {
      body = Object.fromEntries(new URLSearchParams(await request.text()));
    } else {
      body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }
    return Response.json(await handleBillplzCallbackPayload(url, body));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid Billplz callback" },
      { status: 400 }
    );
  }
}
