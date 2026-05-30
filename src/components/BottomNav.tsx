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
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-4 pt-2">
        <div className="glass-strong rounded-full px-2 py-2">
          <ul className="flex items-center justify-around">
            {items.map(({ to, label, icon: Icon, badge }) => {
              const active =
                to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-label={label}
                    className="group relative flex items-center justify-center px-2 py-1"
                  >
                    <span
                      className={`relative grid h-11 w-11 place-items-center rounded-full transition-all ${
                        active
                          ? "bg-white/15 text-white ring-1 ring-white/25 shadow-inner-glass"
                          : "text-white/60"
                      }`}
                    >
                      <Icon
                        className="h-[20px] w-[20px]"
                        strokeWidth={active ? 2.6 : 2}
                        fill={active ? "currentColor" : "none"}
                      />
                      {badge > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white ring-2 ring-background">
                          {badge}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

