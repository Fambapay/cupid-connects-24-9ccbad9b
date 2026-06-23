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
  const { email: searchEmail } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | undefined>(searchEmail);
  const [countdown, setCountdown] = useState(60);
  const lastSendRef = useRef<number>(Date.now());

  useEffect(() => {
    if (email) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, [email]);

  // Poll for verification every 3s
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

  // Countdown for resend
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
    <AuthShell title="Verifica o teu email">
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="grid h-20 w-20 place-items-center rounded-full bg-gradient-sunset shadow-glow"
        >
          <Mail className="h-8 w-8 text-white" />
        </motion.div>
        <p className="mt-6 text-base text-muted-foreground">
          Enviámos um link para{" "}
          <span className="font-medium text-foreground">{email ?? "o teu email"}</span>.
          Clica no link para continuar.
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={countdown > 0}
          className="mt-6 text-sm font-medium text-foreground underline disabled:text-muted-foreground disabled:no-underline"
        >
          {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar email"}
        </button>
        <Link to="/auth/register" className="mt-3 text-sm text-muted-foreground">
          Usar outro email
        </Link>
      </div>
    </AuthShell>
  );
}
