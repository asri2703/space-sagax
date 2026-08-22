import { handleBillplzRedirectPayload } from "@/lib/saga";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await handleBillplzRedirectPayload(url);
  const background = "#f6f1e8";
  const body = result.ok
    ? `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Saga X Space - Payment Status</title>
        <style>
          body{font-family:Arial,sans-serif;background:${background};color:#191926;margin:0;padding:40px}
          .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px}
          a{color:#2d2cff;font-weight:700;text-decoration:none}
        </style>
      </head>
      <body>
        <div class="card">
          <p style="text-transform:uppercase;letter-spacing:.16em;color:#2d2cff;font-size:12px;margin:0 0 10px">Saga X Space</p>
          <h1 style="margin:0 0 14px;font-size:32px;line-height:1.1">Payment update</h1>
          <p style="line-height:1.7;margin:0 0 18px">${result.message}</p>
          <p style="line-height:1.7;margin:0"><a href="${new URL("/", url).toString()}">Return to booking page</a></p>
        </div>
      </body>
      </html>`
    : `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Saga X Space - Payment Status</title>
        <style>
          body{font-family:Arial,sans-serif;background:${background};color:#191926;margin:0;padding:40px}
          .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px}
        </style>
      </head>
      <body>
        <div class="card">
          <h1 style="margin:0 0 14px;font-size:32px;line-height:1.1">Payment verification failed</h1>
          <p style="line-height:1.7;margin:0">${result.message}</p>
        </div>
      </body>
      </html>`;

  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
    status: result.ok ? 200 : 401,
  });
}
