import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, RotateCcw, Sparkles, Zap } from "lucide-react";

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
    <AppShell fullHeight>
      {/* Card stage — fills available space, no scroll */}
      <div className="relative mx-4 mt-4 flex-1 min-h-0">

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
              className="absolute inset-0 grid place-items-center rounded-[28px] border border-dashed border-border bg-card p-8 text-center shadow-soft"
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

      {/* Tinder-style action row — 5 circular buttons */}
      <div className="mt-5 flex items-center justify-center gap-4 px-6">
        <ActionButton onClick={reset} label="Voltar" size="sm" iconColor="text-sunset">
          <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
        </ActionButton>

        <ActionButton
          onClick={() => handleSwipe("left")}
          label="Passar"
          size="lg"
          iconColor="text-rose"
        >
          <X className="h-8 w-8" strokeWidth={3} />
        </ActionButton>

        <ActionButton
          onClick={() => handleSwipe("right")}
          label="Super like"
          size="md"
          iconColor="text-primary"
        >
          <Star className="h-6 w-6 fill-current" strokeWidth={0} />
        </ActionButton>

        <ActionButton
          onClick={() => handleSwipe("right")}
          label="Curtir"
          size="lg"
          iconColor="text-mint"
        >
          <Heart className="h-8 w-8 fill-current" strokeWidth={0} />
        </ActionButton>

        <ActionButton onClick={() => {}} label="Boost" size="sm" iconColor="text-grape">
          <Zap className="h-5 w-5 fill-current" strokeWidth={0} />
        </ActionButton>
      </div>

      {lastAction && (
        <p className="mt-3 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
  iconColor,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  size?: "sm" | "md" | "lg";
  iconColor: string;
}) {
  const dim =
    size === "lg" ? "h-[64px] w-[64px]" : size === "md" ? "h-[52px] w-[52px]" : "h-[44px] w-[44px]";

  return (
    <motion.button
      whileTap={{ scale: 0.86 }}
      whileHover={{ y: -2, scale: 1.04 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={onClick}
      aria-label={label}
      className={`glass-strong grid ${dim} ${iconColor} place-items-center rounded-full`}

    >
      {children}
    </motion.button>
  );
}
