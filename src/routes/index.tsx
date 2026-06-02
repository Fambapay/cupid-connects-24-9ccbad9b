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

const darkGlass = {
  background: "rgba(20,20,22,0.78)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.35)",
} as const;

function CircleBtn({
  size,
  onClick,
  label,
  style,
  children,
}: {
  size: number;
  onClick: () => void;
  label: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92, opacity: 0.85 }}
      onClick={onClick}
      aria-label={label}
      className="grid place-items-center rounded-full"
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    >
      {children}
    </motion.button>
  );
}

function RewindButton({ onClick }: { onClick: () => void }) {
  return (
    <CircleBtn size={48} onClick={onClick} label="Voltar" style={darkGlass}>
      <RotateCcw className="h-[22px] w-[22px]" strokeWidth={2.4} color="#FFB020" />
    </CircleBtn>
  );
}

function NopeButton({ onClick }: { onClick: () => void }) {
  return (
    <CircleBtn
      size={62}
      onClick={onClick}
      label="Passar"
      style={{
        background: "#FF3B6B",
        border: "none",
        boxShadow:
          "0 8px 22px -6px rgba(255,59,107,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </CircleBtn>
  );
}

function SuperLikeButton({ onClick }: { onClick: () => void }) {
  return (
    <CircleBtn size={54} onClick={onClick} label="Super like" style={darkGlass}>
      <svg width="26" height="26" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A6FFF" />
            <stop offset="100%" stopColor="#5BB8FF" />
          </linearGradient>
        </defs>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="url(#starGrad)"
        />
      </svg>
    </CircleBtn>
  );
}

function LikeButton({ onClick }: { onClick: () => void }) {
  return (
    <CircleBtn size={62} onClick={onClick} label="Curtir" style={darkGlass}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
          stroke="#30E37C"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    </CircleBtn>
  );
}

