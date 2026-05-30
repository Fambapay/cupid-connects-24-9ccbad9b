import { Link, useLocation } from "@tanstack/react-router";
import { Flame, Compass, Heart, MessageCircle, User } from "lucide-react";

const items = [
  { to: "/", label: "Swipe", icon: Flame, badge: 0, fillWhenActive: true },
  { to: "/explore", label: "Explore", icon: Compass, badge: 0, fillWhenActive: false },
  { to: "/matches", label: "Likes", icon: Heart, badge: 6, fillWhenActive: true },
  { to: "/chat", label: "Chat", icon: MessageCircle, badge: 0, fillWhenActive: false },
  { to: "/profile", label: "Perfil", icon: User, badge: 0, fillWhenActive: false },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-3 pb-3 pt-2">
        <div className="glass-strong rounded-[28px] px-2 py-2">
          <ul className="flex items-center justify-between">
            {items.map(({ to, label, icon: Icon, badge, fillWhenActive }) => {
              const active =
                to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <li key={to} className="flex-1">
                  <Link
                    to={to}
                    aria-label={label}
                    className="group relative flex flex-col items-center justify-center gap-0.5 py-1.5"
                  >
                    <span
                      className={`relative grid h-9 w-9 place-items-center rounded-full transition-all ${
                        active
                          ? "bg-white/12 text-white ring-1 ring-white/20 shadow-inner-glass"
                          : "text-white/55"
                      }`}
                    >
                      <Icon
                        className="h-[19px] w-[19px]"
                        strokeWidth={active ? 2.4 : 2}
                        fill={active && fillWhenActive ? "currentColor" : "none"}
                      />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-sunset px-1 text-[9px] font-bold text-black/85 ring-2 ring-[oklch(0.18_0.02_270)]">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-tight ${
                        active ? "text-white" : "text-white/55"
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
      </div>
    </nav>
  );
}
