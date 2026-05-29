import { Link, useLocation } from "@tanstack/react-router";
import { Flame, MessageCircle, Heart, User } from "lucide-react";

const items = [
  { to: "/", label: "Descobrir", icon: Flame },
  { to: "/matches", label: "Matches", icon: Heart },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active =
            to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[10px] font-medium"
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full transition-all ${
                    active ? "bg-gradient-flame text-flame-foreground shadow-glow" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
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
