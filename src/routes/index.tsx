import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, RotateCcw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SwipeCard } from "@/components/SwipeCard";
import { profiles } from "@/data/profiles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flama — Descubra novas conexões" },
      { name: "description", content: "Conheça pessoas perto de você. Desliza pra curtir, encontra seu match." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [index, setIndex] = useState(0);
  const [lastAction, setLastAction] = useState<"like" | "nope" | null>(null);

  const handleSwipe = (dir: "left" | "right") => {
    setLastAction(dir === "right" ? "like" : "nope");
    setTimeout(() => setIndex((i) => i + 1), 250);
  };

  const reset = () => {
    setIndex(0);
    setLastAction(null);
  };

  const visible = profiles.slice(index, index + 3);

  return (
    <AppShell>
      {/* Minimal premium top bar */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Descobrir
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Hoje
          </h1>
        </div>
        <button
          type="button"
          aria-label="Boost"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-card text-primary ring-1 ring-border shadow-soft transition active:scale-90"
        >
          <Sparkles className="h-5 w-5 fill-current" strokeWidth={1.5} />
        </button>
      </header>

      {/* Imposing card */}
      <div className="relative mx-4 mt-2 h-[calc(100svh-260px)] min-h-[520px]">
        <AnimatePresence>
          {visible.length > 0 ? (
            visible
              .map((p, i) => (
                <SwipeCard
                  key={p.id}
                  profile={p}
                  isTop={i === 0}
                  offset={i}
                  onSwipe={handleSwipe}
                />
              ))
              .reverse()
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 grid place-items-center rounded-[36px] border border-dashed border-border bg-card p-8 text-center shadow-soft"
            >
              <div>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold">Acabou por aqui</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você viu todo mundo perto. Volte mais tarde.
                </p>
                <button
                  onClick={reset}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  <RotateCcw className="h-4 w-4" />
                  Recomeçar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action row — premium, soft, balanced */}
      <div className="mt-5 flex items-center justify-center gap-3 px-6">
        <ActionButton
          onClick={reset}
          label="Voltar"
          size="md"
          tone="ghost"
        >
          <RotateCcw className="h-5 w-5 text-sunset" strokeWidth={2.5} />
        </ActionButton>

        <ActionButton
          onClick={() => handleSwipe("left")}
          label="Passar"
          size="lg"
          tone="rose"
        >
          <X className="h-8 w-8 text-rose" strokeWidth={3} />
        </ActionButton>

        <div className="relative">
          <ActionButton
            onClick={() => handleSwipe("right")}
            label="Super like"
            size="md"
            tone="ghost"
          >
            <Star className="h-5 w-5 fill-grape text-grape" />
          </ActionButton>
          <span className="pointer-events-none absolute -top-1 -right-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-grape px-1 text-[10px] font-bold text-white ring-2 ring-background">
            11
          </span>
        </div>

        <ActionButton
          onClick={() => handleSwipe("right")}
          label="Curtir"
          size="lg"
          tone="mint"
        >
          <Heart className="h-8 w-8 fill-mint text-mint" strokeWidth={0} />
        </ActionButton>
      </div>

      {lastAction && (
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          {lastAction === "like" ? "Curtido" : "Passou"}
        </p>
      )}
    </AppShell>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  size = "md",
  tone = "ghost",
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  size?: "md" | "lg";
  tone?: "ghost" | "rose" | "mint";
}) {
  const dim = size === "lg" ? "h-[72px] w-[72px]" : "h-12 w-12";
  const toneCls =
    tone === "rose"
      ? "bg-card shadow-rose ring-1 ring-rose/20"
      : tone === "mint"
        ? "bg-card shadow-mint ring-1 ring-mint/20"
        : "bg-card shadow-soft ring-1 ring-border";

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={onClick}
      aria-label={label}
      className={`grid ${dim} place-items-center rounded-full ${toneCls}`}
    >
      {children}
    </motion.button>
  );
}
