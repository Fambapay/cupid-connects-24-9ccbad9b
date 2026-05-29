import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-24">{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/90 px-5 py-4 backdrop-blur-xl">
      <h1 className="text-2xl font-bold">
        <span className="text-gradient-sunset">{title}</span>
      </h1>
    </header>
  );
}
