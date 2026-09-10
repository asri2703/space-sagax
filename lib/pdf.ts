// PDF generator using Puppeteer Core + @sparticuz/chromium.
//
// In production (Vercel) we use the Lambda-optimised Chromium build,
// which is small and works inside the Vercel serverless function
// memory limit. In local dev (Windows/macOS/Linux) we fall back to
// the system Chrome / Chromium so devs don't need to download the
// sparticuz binary locally.

import puppeteer, { Browser } from "puppeteer-core";

let cachedBrowser: Promise<Browser> | null = null;

async function launchLocalBrowser(): Promise<Browser> {
  // Common Chrome / Chromium locations
  const candidates: Record<string, string[]> = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/microsoft-edge",
      "/snap/bin/chromium",
    ],
  };

  const paths = candidates[process.platform] || candidates.linux;
  for (const p of paths) {
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(p)) {
        return await puppeteer.launch({
          executablePath: p,
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }
    } catch {
      // try next
    }
  }
  throw new Error(
    "No local Chrome / Chromium / Edge binary found. Install Chrome or set CHROME_PATH."
  );
}

async function launchVercelBrowser(): Promise<Browser> {
  // Dynamic import keeps the sparticuz/chromium binary out of the
  // dev bundle — it's only needed on Vercel.
  const chromium = (await import("@sparticuz/chromium")).default;
  const execPath = await chromium.executablePath();
  return await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 794, height: 1123 }, // A4 @ 96dpi
    executablePath: execPath,
    headless: true,
  });
}

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser) return cachedBrowser;
  cachedBrowser = (async () => {
    // Vercel sets VERCEL=1 in the serverless runtime.
    if (process.env.VERCEL === "1") {
      return await launchVercelBrowser();
    }
    return await launchLocalBrowser();
  })();
  return cachedBrowser;
}

export async function renderHtmlToPdf(html: string, options: {
  format?: "A4" | "Letter";
  landscape?: boolean;
} = {}): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    const pdf = await page.pdf({
      format: options.format || "A4",
      landscape: options.landscape || false,
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    // Don't close — reuse the browser across warm invocations.
  }
}

export async function closeBrowser() {
  if (cachedBrowser) {
    const b = await cachedBrowser;
    await b.close();
    cachedBrowser = null;
  }
}
