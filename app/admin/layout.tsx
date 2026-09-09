import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Saga X Space — Admin",
  description:
    "Admin dashboard for Saga X Space bookings, promo pricing, and booking management.",
};

/**
 * Admin-only layout. Loads Outfit (headings) + Plus Jakarta Sans (body) from
 * Google Fonts. These are scoped to the admin section via the .admin-shell
 * class so the public site keeps its existing typography.
 *
 * We use <link> instead of next/font to keep the dependency surface minimal
 * (no @next/font install needed) and to let the design system's spec drive
 * exactly which weights we request.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap"
      />
      {children}
    </>
  );
}