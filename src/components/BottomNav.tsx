import { Link, useLocation } from "@tanstack/react-router";
import { Flame, MessageCircle, Heart, User } from "lucide-react";

const items = [
  { to: "/", label: "Descobrir", icon: Flame, badge: 0 },
  { to: "/matches", label: "Likes", icon: Heart, badge: 2 },
  { to: "/chat", label: "Chat", icon: MessageCircle, badge: 0 },
  { to: "/profile", label: "Perfil", icon: User, badge: 0 },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon, badge }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 text-[10px] font-medium"
              >
                <span
                  className={`relative grid h-9 w-9 place-items-center rounded-full transition-all ${
                    active ? "bg-gradient-flame text-flame-foreground shadow-glow" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white ring-2 ring-background">
                      {badge}
                    </span>
                  )}
                </span>
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
