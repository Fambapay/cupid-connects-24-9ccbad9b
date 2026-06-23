import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  children,
  hideNav = false,
  fullHeight = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
  fullHeight?: boolean;
}) {
  return (
    <div className="relative min-h-[100lvh] bg-background text-foreground">
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

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background px-5 py-4">
      <h1 className="text-2xl tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
        <span className="text-white">{title}</span>
      </h1>
    </header>
  );
}
