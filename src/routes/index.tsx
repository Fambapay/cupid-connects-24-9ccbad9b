import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";

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

  const handleSwipe = (_dir: "left" | "right") => {
    setTimeout(() => setIndex((i) => i + 1), 250);
  };

  const reset = () => {
    setIndex(0);
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

      {/* Action row — Tinder-style: rewind, nope (coral), super (blue star), like (green heart) */}
      <div className="mt-4 flex shrink-0 items-center justify-between gap-3 px-8">
        <RewindButton onClick={reset} />
        <NopeButton onClick={() => handleSwipe("left")} />
        <SuperLikeButton onClick={() => handleSwipe("right")} />
        <LikeButton onClick={() => handleSwipe("right")} />
      </div>



    </AppShell>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  iconColor,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  iconColor: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.86 }}
      whileHover={{ y: -2, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={onClick}
      aria-label={label}
      className={`glass grid h-[58px] w-[58px] ${iconColor} place-items-center rounded-full`}
    >
      {children}
    </motion.button>
  );
}

