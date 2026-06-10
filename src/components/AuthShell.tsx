import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import logoAsset from "@/assets/hunie-logo.png.asset.json";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Aurora + animated blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-aurora opacity-80" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "var(--brand-pink)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], opacity: [0.22, 0.38, 0.22] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 h-[30rem] w-[30rem] rounded-full blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 32px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-6 flex flex-col items-center"
        >
          <Link to="/" aria-label="Hunie — início" className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full blur-2xl"
              style={{ background: "var(--gradient-sunset)", opacity: 0.5 }}
            />
            <img
              src={logoAsset.url}
              alt="Logótipo Hunie"
              width={72}
              height={72}
              className="h-[72px] w-[72px] drop-shadow-[0_8px_24px_rgba(255,79,163,0.45)]"
            />
          </Link>
        </motion.div>

        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-6 text-center"
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient-sunset">{title}</span>
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="glass-strong rounded-3xl p-6 shadow-card"
        >
          {children}
        </motion.div>

        {footer && (
          <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
