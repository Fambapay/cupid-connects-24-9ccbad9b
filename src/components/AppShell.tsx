import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  hideNav = false,
  fullHeight = false,
  className,
}: {
  children: ReactNode;
  hideNav?: boolean;
  fullHeight?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-[100lvh] bg-background text-foreground", className)}>
      {/* Single static aurora layer (was 2 stacked fixed gradients — costly on every paint) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-aurora opacity-90"
        style={{ contain: "strict" }}
      />
      {fullHeight ? (
        <div className="screen-scroll mx-auto flex min-h-[100lvh] max-w-md flex-col pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      ) : (
        <div className="screen-scroll mx-auto min-h-[100lvh] max-w-md pt-[env(safe-area-inset-top)]">{children}</div>
      )}
      {!hideNav && <BottomNav />}
    </div>
  );
}

export function TopBar({ title, className }: { title: string; className?: string }) {
  return (
    <header className={cn("sticky top-0 z-30 flex items-center justify-between bg-[var(--profile-bg)] px-5 py-4", className)}>
      <h1 className="text-2xl tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
        <span className="text-foreground">{title}</span>
      </h1>
    </header>
  );
}
