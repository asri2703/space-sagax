import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saga X Space",
  description:
    "Book Saga X Space for meetings, classes, workshops, and seminars. Pay by Billplz FPX, bank transfer, or QR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
