import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { useForceDarkTheme } from "@/lib/theme";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Nova palavra-passe — Hunie" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  useForceDarkTheme();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const minOk = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const strong = minOk && hasNumber && hasLetter;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strong) return;
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      setDone(true);
      toast({ title: "Tudo certo", description: "A tua palavra-passe foi atualizada." });
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth/login" });
      }, 1400);
    } catch (err: any) {
      toast({
        title: "Não deu",
        description: err?.message ?? "Tenta de novo daqui a pouco.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Nova palavra-passe"
      subtitle={
        done
          ? undefined
          : ready
          ? "Escolhe uma palavra-passe forte. A próxima vez que entrares, é com esta."
          : undefined
      }
    >
      {done ? (
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid h-16 w-16 place-items-center rounded-full bg-gradient-sunset shadow-glow"
          >
            <ShieldCheck className="h-7 w-7 text-white" />
          </motion.div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Palavra-passe atualizada. A levar-te para o login…
          </p>
        </div>
      ) : !ready ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">A validar o teu link…</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Nova palavra-passe
            </Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                id="password"
                type={show ? "text" : "password"}
                autoFocus
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Pelo menos 8 caracteres"
                className="h-12 rounded-full border-white/10 bg-white/5 pl-11 pr-12 text-sm transition-colors focus-visible:border-white/30 focus-visible:bg-white/[0.07]"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <ul className="space-y-1.5 px-1 text-xs">
            <Rule ok={minOk} label="8 caracteres ou mais" active={password.length > 0} />
            <Rule ok={hasLetter} label="Inclui uma letra" active={password.length > 0} />
            <Rule ok={hasNumber} label="Inclui um número" active={password.length > 0} />
          </ul>

          <Button
            type="submit"
            disabled={busy || !strong}
            className="group h-12 w-full rounded-full bg-gradient-sunset text-sm font-semibold text-white shadow-glow transition-transform hover:shadow-[0_16px_40px_-8px_rgba(255,79,163,0.55)] active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                Atualizar palavra-passe
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </form>
      )}

      {!done && (
        <div className="mt-6 border-t border-white/5 pt-4 text-center text-xs">
          <Link
            to="/auth/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Voltar para entrar
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

function Rule({ ok, label, active }: { ok: boolean; label: string; active: boolean }) {
  const tone = !active
    ? "text-muted-foreground/60"
    : ok
    ? "text-foreground"
    : "text-muted-foreground/80";
  return (
    <li className={`flex items-center gap-2 transition-colors ${tone}`}>
      <span
        className={`grid h-4 w-4 place-items-center rounded-full border transition-all ${
          ok
            ? "border-transparent bg-gradient-sunset text-white"
            : "border-white/15 bg-white/[0.03]"
        }`}
      >
        {ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      {label}
    </li>
  );
}
