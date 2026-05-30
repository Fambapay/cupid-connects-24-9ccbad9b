import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Aurora ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-aurora opacity-90" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-10%,oklch(0.3_0.08_280/0.5),transparent_60%)]" />
      <div className="mx-auto max-w-md pb-28">{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/60 px-5 py-4 backdrop-blur-xl">
      <h1 className="text-2xl font-bold">
        <span className="text-gradient-sunset">{title}</span>
      </h1>
    </header>
  );
}
