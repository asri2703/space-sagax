import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://space.sagaxventures.com"),
  title: "Saga X Space | Hall Booking in Senawang",
  description:
    "Book Saga X Space in Senawang for meetings, classes, workshops and small events with simple pricing and easy payment options.",
  openGraph: {
    type: "website",
    siteName: "Saga X Space",
    title: "Saga X Space | Hall Booking in Senawang",
    description:
      "Book Saga X Space in Senawang for meetings, classes, workshops and small events with simple pricing and easy payment options.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saga X Space | Hall Booking in Senawang",
    description:
      "Book Saga X Space in Senawang for meetings, classes, workshops and small events with simple pricing and easy payment options.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-MY" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
