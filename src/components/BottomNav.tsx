import { Link, useLocation } from "@tanstack/react-router";
import { Compass, MessageCircle, Heart, User } from "lucide-react";

const items = [
  { to: "/", label: "Descobrir", icon: Compass, badge: 0 },
  { to: "/matches", label: "Likes", icon: Heart, badge: 2 },
  { to: "/chat", label: "Chat", icon: MessageCircle, badge: 0 },
  { to: "/profile", label: "Perfil", icon: User, badge: 0 },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md border-t border-border/70">
        <ul className="flex items-center justify-around px-3 py-2.5">
          {items.map(({ to, label, icon: Icon, badge }) => {
            const active =
              to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="group relative flex flex-col items-center gap-1 px-3 py-1"
                >
                  <span
                    className={`relative grid h-9 w-9 place-items-center rounded-xl transition-all ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon
                      className="h-[20px] w-[20px]"
                      strokeWidth={active ? 2.5 : 2}
                      fill={active && label === "Descobrir" ? "currentColor" : "none"}
                    />
                    {badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white ring-2 ring-background">
                        {badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
