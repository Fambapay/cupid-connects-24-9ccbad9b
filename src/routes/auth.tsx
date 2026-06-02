import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Hunie" },
      { name: "description", content: "Entra ou cria a tua conta na Hunie." },
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
  const [showEmail, setShowEmail] = useState(false);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tenta de novo";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const r = await signInWithGoogle();
      if (r.error) throw r.error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tenta de novo";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--brand-pink)" }}
        animate={{
          x: [0, 40, 0],
          y: [0, 30, 0],
          opacity: [0.2, 0.32, 0.2],
        }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        animate={{
          x: [0, -30, 0],
          y: [0, -20, 0],
          opacity: [0.18, 0.3, 0.18],
        }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--brand-magenta)" }}
        animate={{
          x: [0, 25, 0],
          y: [0, -25, 0],
          opacity: [0.14, 0.24, 0.14],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex min-h-[100dvh] flex-col px-6 pb-8 pt-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-sm text-center"
        >
          <h1 className="text-gradient-sunset text-6xl font-bold tracking-tight">
            Hunie
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {mode === "forgot"
              ? "Vamos repor a tua password."
              : mode === "signup"
                ? "Junta-te à nossa colmeia."
                : "Encontra a tua pessoa."}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mt-auto w-full max-w-sm"
        >
          <div className="glass-strong rounded-3xl p-6 shadow-card">
            {mode !== "forgot" && (
              <Button
                onClick={google}
                disabled={busy}
                className="h-14 w-full rounded-2xl bg-white text-black hover:bg-white/90 active:scale-[0.98]"
              >
                <GoogleIcon className="mr-2 h-5 w-5" />
                Continuar com Google
              </Button>
            )}

            {!showEmail && mode !== "forgot" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-white/10" />
                  ou
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <Button
                  onClick={() => setShowEmail(true)}
                  variant="ghost"
                  className="h-14 w-full rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Continuar com email
                </Button>
              </>
            )}

            <AnimatePresence initial={false}>
              {(showEmail || mode === "forgot") && (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={submit}
                  className="space-y-3 overflow-hidden"
                >
                  <div className={cn(mode === "forgot" ? "" : "mt-4")}>
                    {mode === "signup" && (
                      <div className="mb-3 space-y-1.5">
                        <Label htmlFor="name" className="text-xs">
                          Nome
                        </Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="h-12 rounded-xl bg-white/5"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 rounded-xl bg-white/5"
                      />
                    </div>
                    {mode !== "forgot" && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs">
                            Password
                          </Label>
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
                          className="h-12 rounded-xl bg-white/5"
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-14 w-full rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow active:scale-[0.98]"
                  >
                    {mode === "signin"
                      ? "Entrar"
                      : mode === "signup"
                        ? "Criar conta"
                        : "Enviar email"}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Toggle */}
          <div className="mt-5 text-center text-sm">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-muted-foreground hover:text-foreground"
              >
                Voltar para entrar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setShowEmail(true);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {mode === "signin" ? (
                  <>
                    Ainda não tens conta?{" "}
                    <span className="font-semibold text-foreground">
                      Criar conta
                    </span>
                  </>
                ) : (
                  <>
                    Já tens conta?{" "}
                    <span className="font-semibold text-foreground">
                      Entrar
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="mt-6 px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            Ao continuar concordas com os nossos Termos e Política de
            Privacidade.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18a10.99 10.99 0 0 0 0 9.86l3.66-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
