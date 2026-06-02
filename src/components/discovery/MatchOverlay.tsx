import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PINK = "#FF4FA3";

interface Props {
  open: boolean;
  targetName: string;
  targetPhoto?: string | null;
  onClose: () => void;
  onSeeLikes?: () => void;
}

export function MatchOverlay({ open, targetName, targetPhoto, onClose, onSeeLikes }: Props) {
  const { user } = useAuth();
  const [myPhoto, setMyPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("profile_photos")
        .select("url")
        .eq("profile_id", user.id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancel) setMyPhoto((data as { url?: string } | null)?.url ?? null);
    })();
    return () => {
      cancel = true;
    };
  }, [open, user]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="match-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] grid place-items-center px-6"
          onClick={onClose}
          style={{
            background:
              "radial-gradient(120% 80% at 50% 40%, rgba(255,79,163,0.35) 0%, rgba(177,60,255,0.18) 35%, rgba(0,0,0,0.92) 75%)",
            backdropFilter: "blur(22px)",
            WebkitBackdropFilter: "blur(22px)",
          }}
        >
          {/* pulsing aura */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,79,163,0.45), transparent 70%)",
              filter: "blur(40px)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* floating hearts */}
          {[
            { x: -140, delay: 0.1, size: 18 },
            { x: 130, delay: 0.4, size: 14 },
            { x: -80, delay: 0.9, size: 12 },
            { x: 90, delay: 1.3, size: 20 },
            { x: -20, delay: 1.8, size: 10 },
            { x: 40, delay: 2.2, size: 16 },
          ].map((h, i) => (
            <motion.div
              key={i}
              aria-hidden
              className="pointer-events-none absolute bottom-1/3"
              style={{ left: `calc(50% + ${h.x}px)` }}
              initial={{ y: 0, opacity: 0, scale: 0.5 }}
              animate={{ y: -260, opacity: [0, 1, 0], scale: [0.5, 1.1, 0.7] }}
              transition={{ duration: 3.6, delay: h.delay, repeat: Infinity, ease: "easeOut" }}
            >
              <Heart
                fill={PINK}
                stroke="none"
                style={{
                  width: h.size,
                  height: h.size,
                  filter: "drop-shadow(0 6px 14px rgba(255,79,163,0.7))",
                }}
              />
            </motion.div>
          ))}

          <div
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* photos */}
            <div className="relative mb-7 h-[180px] w-[280px]">
              <PhotoBubble
                src={myPhoto}
                fallbackInitial="Tu"
                className="left-0 top-2"
                rotate={-8}
                delay={0.1}
              />
              <PhotoBubble
                src={targetPhoto ?? null}
                fallbackInitial={targetName[0] ?? "?"}
                className="right-0 top-2"
                rotate={8}
                delay={0.2}
              />
              {/* center heart badge */}
              <motion.div
                initial={{ scale: 0, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 260, damping: 16 }}
                className="absolute left-1/2 top-1/2 z-10 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${PINK} 0%, #B13CFF 100%)`,
                  boxShadow:
                    "0 18px 40px -10px rgba(255,79,163,0.7), inset 0 1px 0 rgba(255,255,255,0.35)",
                  border: "3px solid #0a0a12",
                }}
              >
                <Heart className="h-7 w-7 text-white" fill="currentColor" />
              </motion.div>
            </div>

            {/* sparkle tagline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/70"
            >
              <Sparkles className="h-3 w-3" style={{ color: PINK }} />
              Curtiram-se mutuamente
              <Sparkles className="h-3 w-3" style={{ color: PINK }} />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.65, type: "spring", stiffness: 200, damping: 18 }}
              className="mt-2 text-center text-[42px] font-black leading-none tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #FFD66B 0%, #FF4FA3 45%, #B13CFF 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 4px 18px rgba(255,79,163,0.35))",
              }}
            >
              É um match!
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.4 }}
              className="mt-3 max-w-[300px] text-center text-[14px] leading-relaxed text-white/80"
            >
              Tu e <span className="font-semibold text-white">{targetName}</span> querem
              conhecer-se. Faz o primeiro movimento.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="mt-7 flex w-full max-w-[320px] flex-col gap-2.5"
            >
              <button
                type="button"
                onClick={onSeeLikes}
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-bold text-white transition-transform active:scale-[0.97]"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${PINK} 0%, #B13CFF 100%)`,
                  boxShadow:
                    "0 18px 40px -14px rgba(255,79,163,0.85), inset 0 1px 0 rgba(255,255,255,0.28)",
                }}
              >
                <MessageCircle className="h-[16px] w-[16px]" strokeWidth={2.4} />
                Enviar mensagem
              </button>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full px-5 py-3 text-[13px] font-medium text-white/75 transition-transform active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(14px)",
                }}
              >
                Continuar a descobrir
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PhotoBubble({
  src,
  fallbackInitial,
  className,
  rotate,
  delay,
}: {
  src: string | null;
  fallbackInitial: string;
  className?: string;
  rotate: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0, y: 30, rotate: 0 }}
      animate={{ scale: 1, opacity: 1, y: 0, rotate }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 18 }}
      className={`absolute h-[170px] w-[140px] overflow-hidden rounded-[28px] ${className ?? ""}`}
      style={{
        boxShadow:
          "0 26px 50px -18px rgba(0,0,0,0.7), 0 0 0 3px rgba(255,79,163,0.55), 0 0 28px rgba(255,79,163,0.45)",
      }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="grid h-full w-full place-items-center text-3xl font-black text-white/85"
          style={{
            background: `linear-gradient(135deg, ${PINK} 0%, #B13CFF 100%)`,
          }}
        >
          {fallbackInitial.toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}
