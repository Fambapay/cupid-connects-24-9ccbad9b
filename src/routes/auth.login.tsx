import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { redirectIfAuthenticated } from "@/lib/authGuard";

export const Route = createFileRoute("/auth/login")({
  ssr: false,
  beforeLoad: redirectIfAuthenticated,
  head: () => ({ meta: [{ title: "Entrar — Hunie" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerify(false);
    setBusy(true);
    try {
      const { data, error: err } = await signInWithPassword(email, password);
      if (err) {
        if (/confirm|verify/i.test(err.message)) {
          setNeedsVerify(true);
          setError("Verifica o teu email antes de continuar");
        } else {
          setError("Email ou palavra-passe incorretos");
        }
        return;
      }
      if (!data.user?.email_confirmed_at) {
        navigate({ to: "/auth/verify-email" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("id", data.user.id)
        .maybeSingle();
      router.invalidate();
      if (!profile?.onboarding_completed) {
        navigate({ to: "/onboarding", search: { step: profile?.onboarding_step ?? 1 } });
      } else {
        navigate({ to: "/discover" });
      }
    } catch {
      setError("Sem ligação. Verifica a tua internet.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email) return;
    await supabase.auth.resend({ type: "signup", email });
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError("Erro ao iniciar sessão com Google");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Bem-vindo de volta. Continua a tua jornada.">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleBusy}
        style={{ color: "#1f1f1f" }}
        className="group relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-white text-sm font-semibold shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] transition-all hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] active:scale-[0.98] disabled:opacity-60"
      >
        {googleBusy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <GoogleIcon />
            <span>Continuar com Google</span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3 py-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-foreground/15" />
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">ou com email</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-foreground/15" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@exemplo.com"
              className="h-12 rounded-full border-white/10 bg-white/5 pl-11 pr-4 text-sm transition-colors focus-visible:border-white/30 focus-visible:bg-white/[0.07]"
            />
          </div>
        </Field>
        <Field label="Palavra-passe">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="h-12 rounded-full border-white/10 bg-white/5 pl-11 pr-12 text-sm transition-colors focus-visible:border-white/30 focus-visible:bg-white/[0.07]"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
              className="absolute inset-y-0 right-4 my-auto text-muted-foreground transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {error && (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            {error}
            {needsVerify && (
              <>
                {" "}
                <button type="button" onClick={resend} className="font-semibold underline">
                  Reenviar email
                </button>
              </>
            )}
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
              Entrar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </Button>
      </form>
      <div className="mt-6 space-y-3 text-center text-sm">
        <div>
          <Link to="/auth/forgot-password" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
            Esqueceste a palavra-passe?
          </Link>
        </div>
        <div className="border-t border-white/5 pt-3 text-xs text-muted-foreground">
          Não tens conta?{" "}
          <Link to="/auth/register" className="font-semibold text-gradient-sunset">
            Criar conta
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
