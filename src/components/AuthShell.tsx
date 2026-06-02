import type { ReactNode } from "react";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-70" />
      <div
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 64px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        }}
      >
        <h1 className="text-gradient-sunset mb-8 text-4xl font-bold tracking-tight">
          {title}
        </h1>
        <div className="glass-strong rounded-3xl p-6 shadow-card">{children}</div>
      </div>
    </div>
  );
}
