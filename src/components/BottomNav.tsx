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
      <div className="mx-auto max-w-md px-4 pb-3 pt-2">
        <div
          className="relative rounded-[28px] px-3 py-1.5 backdrop-blur-2xl"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.22 0.02 270 / 0.78) 0%, oklch(0.16 0.02 270 / 0.88) 100%)",
            boxShadow:
              "0 18px 50px -18px oklch(0 0 0 / 0.7), 0 1px 0 0 oklch(1 0 0 / 0.06) inset, 0 -1px 0 0 oklch(0 0 0 / 0.3) inset",
            border: "1px solid oklch(1 0 0 / 0.07)",
          }}
        >
          <ul className="flex items-center justify-between">

            {items.map(({ to, label, icon: Icon, badge, fillWhenActive }) => {
              const active =
                to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <li key={to} className="flex-1">
                  <Link
                    to={to}
                    aria-label={label}
                    className="group relative flex flex-col items-center justify-center gap-1 py-1"
                  >
                    <span
                      className={`relative grid h-10 w-10 place-items-center rounded-full transition-all duration-300 ${
                        active
                          ? "bg-white/[0.06] ring-1 ring-white/15 shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.12),inset_0_-1px_0_0_oklch(0_0_0_/_0.35)]"
                          : ""
                      }`}
                    >
                      <Icon
                        className={`transition-all ${
                          active ? "h-[22px] w-[22px] text-white drop-shadow-[0_0_8px_oklch(1_0_0_/_0.35)]" : "h-[21px] w-[21px] text-white/70"
                        }`}
                        strokeWidth={active ? 2.2 : 1.9}
                        fill={active && fillWhenActive ? "currentColor" : "none"}
                      />
                      {badge > 0 && (
                        <span
                          className="absolute -top-0.5 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-black ring-2"
                          style={{
                            background: "linear-gradient(180deg, oklch(0.92 0.16 90) 0%, oklch(0.82 0.18 75) 100%)",
                            boxShadow: "0 2px 6px -1px oklch(0.82 0.18 75 / 0.55)",
                            ["--tw-ring-color" as never]: "oklch(0.16 0.02 270)",
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[11px] tracking-tight transition-colors ${
                        active ? "text-white font-semibold" : "text-white/65 font-medium"
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
