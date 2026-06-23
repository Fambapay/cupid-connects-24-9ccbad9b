import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { useForceDarkTheme } from "@/lib/theme";

export const Route = createFileRoute("/auth/verify-email")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({ meta: [{ title: "Verifica o teu email — Hunie" }] }),
  component: VerifyEmail,
});

function VerifyEmail() {
  useForceDarkTheme();
  const { email: searchEmail } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | undefined>(searchEmail);
  const [countdown, setCountdown] = useState(60);
  const lastSendRef = useRef<number>(Date.now());

  useEffect(() => {
    if (email) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, [email]);

  useEffect(() => {
    const id = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        clearInterval(id);
        navigate({ to: "/onboarding", search: { step: 1 } });
      }
    }, 3000);
    return () => clearInterval(id);
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const resend = async () => {
    if (countdown > 0 || !email) return;
    await supabase.auth.resend({ type: "signup", email });
    lastSendRef.current = Date.now();
    setCountdown(60);
  };

  return (
    <AuthShell title="Verifica o teu email" subtitle="Estamos à espera da tua confirmação.">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full blur-2xl"
            style={{ background: "var(--gradient-sunset)" }}
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="grid h-20 w-20 place-items-center rounded-full bg-gradient-sunset shadow-glow"
          >
            <Mail className="h-8 w-8 text-white" />
          </motion.div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Enviámos um link para
        </p>
        <p className="mt-1 break-all text-sm font-medium text-foreground">
          {email ?? "o teu email"}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Clica no link para continuar. Esta página atualiza automaticamente.
        </p>

        <button
          type="button"
          onClick={resend}
          disabled={countdown > 0}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-muted-foreground"
        >
          {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar email"}
        </button>
      </div>
      <div className="mt-6 border-t border-white/5 pt-4 text-center text-xs">
        <Link to="/auth/register" className="text-muted-foreground transition-colors hover:text-foreground">
          Usar outro email
        </Link>
      </div>
    </AuthShell>
  );
}
