import { Link, useLocation } from "@tanstack/react-router";
import { Flame, Heart, User } from "lucide-react";

const items = [
  { to: "/", label: "Swipe", icon: Flame, fillWhenActive: true },
  { to: "/matches", label: "Matches", icon: Heart, fillWhenActive: true },
  { to: "/profile", label: "Perfil", icon: User, fillWhenActive: false },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-black/70 backdrop-blur-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        height: "calc(64px + env(safe-area-inset-bottom))",
      }}
    >
      {items.map(({ to, label, icon: Icon, fillWhenActive }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="flex h-16 flex-1 flex-col items-center justify-center transition-colors active:scale-95"
            style={{ color: active ? "#FF4458" : "rgba(255,255,255,0.45)" }}
          >
            <Icon size={24} fill={active && fillWhenActive ? "currentColor" : "none"} />
            <span className="mt-1 text-[10px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
