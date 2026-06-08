import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/AuthShell";
import { cn } from "@/lib/utils";
import { redirectIfAuthenticated } from "@/lib/authGuard";
import { sendTransactionalEmail } from "@/lib/email/send";

export const Route = createFileRoute("/auth/register")({
  ssr: false,
  beforeLoad: redirectIfAuthenticated,
  head: () => ({ meta: [{ title: "Criar conta — Hunie" }] }),
  component: RegisterPage,
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqLen = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqNum = /\d/.test(password);
  const passOk = reqLen && reqUpper && reqNum;

  const onEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRe.test(email)) {
      setEmailError("Email inválido");
      return;
    }
    setEmailError(null);
    setStep(2);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passOk) return;
    setError(null);
    setBusy(true);
    try {
      const { error: err } = await signUp(email, password);
      if (err) {
        setError(err.message);
        return;
      }
      // Fire-and-forget welcome email; don't block navigation on failure.
      sendTransactionalEmail({
        templateName: "welcome",
        recipientEmail: email,
        idempotencyKey: `welcome-${email.toLowerCase()}`,
      }).catch((e) => console.warn("welcome email failed", e));
      navigate({ to: "/auth/verify-email", search: { email } });
    } catch {
      setError("Sem ligação. Verifica a tua internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Criar conta">
      {step === 1 ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleBusy}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white font-semibold text-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {googleBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Continuar com Google
              </>
            )}
          </button>

          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={onEmailNext} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                autoFocus
                value={email}
                onBlur={() => {
                  if (email && !emailRe.test(email)) setEmailError("Email inválido");
                }}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                required
                className="h-12 rounded-xl bg-white/5"
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="h-14 w-full rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow active:scale-[0.98]"
            >
              Continuar
            </Button>
          </form>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Palavra-passe</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl bg-white/5 pr-12"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-3 my-auto text-muted-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            <Req ok={reqLen}>Mínimo 8 caracteres</Req>
            <Req ok={reqUpper}>Uma letra maiúscula</Req>
            <Req ok={reqNum}>Um número</Req>
          </ul>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={busy || !passOk}
            className="h-14 w-full rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow active:scale-[0.98]"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar conta"}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Já tens conta?{" "}
        <Link to="/auth/login" className="font-semibold text-foreground">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

function Req({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 transition-colors",
        ok ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-full border",
          ok ? "border-transparent bg-gradient-sunset" : "border-white/20",
        )}
      >
        {ok && <Check className="h-3 w-3 text-white" />}
      </span>
      {children}
    </li>
  );
}
