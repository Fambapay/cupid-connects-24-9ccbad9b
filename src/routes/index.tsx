import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, RotateCcw, Zap } from "lucide-react";
import { AppShell, TopBar } from "@/components/AppShell";
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
      <TopBar title="flama" />

      <div className="relative mx-5 mt-2 h-[calc(100vh-260px)] min-h-[440px]">
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
              className="absolute inset-0 grid place-items-center rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center"
            >
              <div>
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-sunset shadow-glow">
                  <Zap className="h-8 w-8 text-flame-foreground" />
                </div>
                <h3 className="text-xl font-bold">Acabou por aqui</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você viu todo mundo perto. Volte mais tarde.
                </p>
                <button
                  onClick={reset}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-flame px-5 py-2.5 text-sm font-semibold text-flame-foreground shadow-glow"
                >
                  <RotateCcw className="h-4 w-4" />
                  Recomeçar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <ActionButton
          onClick={reset}
          label="Voltar"
          size="sm"
          className="bg-card text-sunset shadow-card"
        >
          <RotateCcw className="h-5 w-5" />
        </ActionButton>
        <ActionButton
          onClick={() => handleSwipe("left")}
          label="Passar"
          className="bg-card text-destructive shadow-card"
        >
          <X className="h-8 w-8" strokeWidth={2.5} />
        </ActionButton>
        <ActionButton
          onClick={() => handleSwipe("right")}
          label="Super like"
          size="sm"
          className="bg-card text-grape shadow-card"
        >
          <Star className="h-5 w-5 fill-current" />
        </ActionButton>
        <ActionButton
          onClick={() => handleSwipe("right")}
          label="Curtir"
          className="bg-gradient-flame text-flame-foreground shadow-glow"
        >
          <Heart className="h-8 w-8 fill-current" />
        </ActionButton>
      </div>

      {lastAction && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {lastAction === "like" ? "💖 Curtido" : "👋 Passou"}
        </p>
      )}
    </AppShell>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  size = "lg",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const dim = size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      aria-label={label}
      className={`grid ${dim} place-items-center rounded-full ${className}`}
    >
      {children}
    </motion.button>
  );
}
