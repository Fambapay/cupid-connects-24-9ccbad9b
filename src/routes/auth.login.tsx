import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
  const { signInWithPassword } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
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

  return (
    <AuthShell title="Entrar">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl bg-white/5"
          />
        </Field>
        <Field label="Palavra-passe">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
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
        </Field>
        {error && (
          <p className="text-sm text-destructive">
            {error}
            {needsVerify && (
              <>
                {" "}
                <button type="button" onClick={resend} className="underline">
                  Reenviar email
                </button>
              </>
            )}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy}
          className="h-14 w-full rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow active:scale-[0.98]"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
        </Button>
      </form>
      <div className="mt-5 space-y-2 text-center text-sm">
        <div>
          <Link to="/auth/forgot-password" className="text-muted-foreground hover:text-foreground">
            Esqueceste a palavra-passe?
          </Link>
        </div>
        <div className="text-muted-foreground">
          Não tens conta?{" "}
          <Link to="/auth/register" className="font-semibold text-foreground">
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
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
