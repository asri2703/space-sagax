// /admin — admin dashboard root.
//   Server shell: imports the client component which handles login
//   and the full UI.

import { AdminClient } from "./_client";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Logo size={28} />
        <span className="kicker">Admin</span>
      </header>
      <AdminClient />
    </main>
  );
}
