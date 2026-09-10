import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display-src",
  display: "swap",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body-src",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saga X Space — Hall Rental in Senawang",
  description: "Book a hall in Senawang, Negeri Sembilan. Simple pricing, instant confirmation.",
  metadataBase: new URL("https://space.sagaxventures.com"),
  openGraph: {
    title: "Saga X Space — Hall Rental in Senawang",
    description: "Book a hall in Senawang, Negeri Sembilan.",
    type: "website",
    url: "https://space.sagaxventures.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
