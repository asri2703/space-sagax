import type { Metadata } from "next";
import AdminClient from "./_client";

export const metadata: Metadata = {
  title: "Saga X Space — Admin",
  description:
    "Admin dashboard for Saga X Space bookings, promo pricing, and booking management.",
};

export default function AdminPage() {
  return <AdminClient />;
}