import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
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
    <AuthShell title="Recuperar acesso">
      {sent ? (
        <p className="text-center text-sm text-muted-foreground">
          Enviámos um link para{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl bg-white/5"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="h-14 w-full rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow active:scale-[0.98]"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar link"}
          </Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm">
        <Link to="/auth/login" className="text-muted-foreground hover:text-foreground">
          Voltar para entrar
        </Link>
      </p>
    </AuthShell>
  );
}
