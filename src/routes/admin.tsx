import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, CreditCard, ScrollText, ArrowLeft, Flag } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) throw redirect({ to: "/auth/login" });
    const { data: row } = await supabase
      .from("admin_emails")
      .select("email")
      .maybeSingle();
    if (!row) throw redirect({ to: "/discover" });
    return { adminEmail: row.email };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { adminEmail } = Route.useRouteContext();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Utilizadores", icon: Users },
    { to: "/admin/payments", label: "Pagamentos", icon: CreditCard },
    { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? loc.pathname === to : loc.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to="/discover" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Sair">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-sm font-semibold">Hunie · Admin</p>
            <p className="text-xs text-muted-foreground">{adminEmail}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden rounded-md border border-border px-2 py-1 text-xs"
        >
          Menu
        </button>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`${open ? "block" : "hidden"} md:block w-full md:w-56 shrink-0 border-r border-border/60 md:min-h-[calc(100vh-57px)]`}
        >
          <nav className="flex flex-col gap-1 p-3">
            {items.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  isActive(to, exact)
                    ? "bg-gradient-flame text-flame-foreground shadow-rose"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
