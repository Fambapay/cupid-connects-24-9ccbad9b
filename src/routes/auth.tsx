import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Hunie" },
      { name: "description", content: "Entra ou cria a tua conta." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const {
    isAuthenticated,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    resetPasswordForEmail,
    loading,
  } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/" });
  }, [isAuthenticated, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signInWithPassword(email, password);
        if (error) throw error;
        router.invalidate();
        navigate({ to: "/" });
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        toast({
          title: "Conta criada",
          description: "Verifica o teu email para confirmar.",
        });
      } else {
        const { error } = await resetPasswordForEmail(email);
        if (error) throw error;
        toast({
          title: "Email enviado",
          description: "Verifica o teu email para repor a password.",
        });
        setMode("signin");
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message ?? "Tenta de novo",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await signInWithGoogle();
      if (r.error) throw r.error;
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message ?? "Tenta de novo",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const title =
    mode === "signin"
      ? "Bem-vindo de volta"
      : mode === "signup"
      ? "Cria a tua conta"
      : "Repor password";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gradient-sunset">Hunie</h1>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
        </div>

        {mode !== "forgot" && (
          <>
            <Button
              onClick={google}
              variant="outline"
              className="w-full"
              disabled={busy}
            >
              Continuar com Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex-1 h-px bg-border" />
              OU
              <span className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Esqueceste?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin"
              ? "Entrar"
              : mode === "signup"
              ? "Criar conta"
              : "Enviar email"}
          </Button>
        </form>

        <div className="space-y-2 text-center">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-muted-foreground hover:text-foreground w-full"
            >
              {mode === "signin"
                ? "Ainda não tens conta? Criar conta"
                : "Já tens conta? Entrar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
