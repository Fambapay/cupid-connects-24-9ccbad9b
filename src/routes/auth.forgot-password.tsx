import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, Mail, MailCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/AuthShell";
import { useForceDarkTheme } from "@/lib/theme";

export const Route = createFileRoute("/auth/forgot-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Recuperar palavra-passe — Hunie" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  useForceDarkTheme();
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await resetPasswordForEmail(email);
      if (err) setError(err.message);
      else setSent(true);
    } catch {
      setError("Sem ligação. Verifica a tua internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Recuperar acesso"
      subtitle={sent ? undefined : "Envia-te um link para redefinires a palavra-passe."}
    >
      {sent ? (
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid h-16 w-16 place-items-center rounded-full bg-gradient-sunset shadow-glow"
          >
            <MailCheck className="h-7 w-7 text-white" />
          </motion.div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Enviámos um link para{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Verifica a tua caixa de entrada.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@exemplo.com"
                className="h-12 rounded-full border-white/10 bg-white/5 pl-11 pr-4 text-sm transition-colors focus-visible:border-white/30 focus-visible:bg-white/[0.07]"
              />
            </div>
          </div>
          {error && (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="group h-12 w-full rounded-full bg-gradient-sunset text-sm font-semibold text-white shadow-glow transition-transform hover:shadow-[0_16px_40px_-8px_rgba(255,79,163,0.55)] active:scale-[0.98]"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                Enviar link
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </form>
      )}
      <div className="mt-6 border-t border-white/5 pt-4 text-center text-xs">
        <Link to="/auth/login" className="text-muted-foreground transition-colors hover:text-foreground">
          ← Voltar para entrar
        </Link>
      </div>
    </AuthShell>
  );
}
