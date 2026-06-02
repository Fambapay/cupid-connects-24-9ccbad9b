import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hunie — Encontra alguém que vale a pena" },
      { name: "description", content: "Encontra alguém que vale a pena." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-aurora opacity-80" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "var(--brand-pink)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], opacity: [0.2, 0.32, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "var(--brand-purple)" }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0], opacity: [0.18, 0.3, 0.18] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="relative flex flex-1 flex-col px-6"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
        }}
      >
        <div className="flex flex-[6] flex-col items-center justify-center text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-gradient-sunset text-7xl font-bold tracking-tight"
          >
            Hunie
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-4 max-w-xs text-base text-muted-foreground"
          >
            Encontra alguém que vale a pena
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-[4] flex-col justify-end gap-3"
        >
          <Button
            asChild
            className="h-14 w-full rounded-2xl bg-gradient-sunset text-base font-semibold text-white shadow-glow active:scale-[0.98]"
          >
            <Link to="/auth/register">Criar conta</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-14 w-full rounded-2xl border-white/20 bg-white/5 text-base font-semibold hover:bg-white/10"
          >
            <Link to="/auth/login">Já tenho conta</Link>
          </Button>
          <p className="mt-2 px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            Ao continuar, aceitas os nossos{" "}
            <a href="#" className="underline">Termos</a>{" "}
            e{" "}
            <a href="#" className="underline">Privacidade</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
