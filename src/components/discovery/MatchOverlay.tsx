import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signPhoto } from "@/lib/photos";

const ROSE = "#FF5C8A";
const PLUM = "#9B5BFF";

interface Props {
  open: boolean;
  targetName: string;
  targetPhoto?: string | null;
  sending?: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
}

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

// Pre-computed sparkle / confetti positions
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const radius = 140 + (i % 4) * 30;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    size: 6 + (i % 3) * 3,
    delay: 0.45 + (i % 6) * 0.04,
    hue: i % 2 === 0 ? ROSE : PLUM,
  };
});

const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  x: -160 + Math.random() * 320,
  rot: -180 + Math.random() * 360,
  delay: 0.55 + Math.random() * 0.3,
  dur: 2.2 + Math.random() * 1.6,
  size: 6 + Math.random() * 6,
  hue: [ROSE, PLUM, "#FFD6E4", "#E935A0"][i % 4],
}));

export function MatchOverlay({
  open,
  targetName,
  targetPhoto,
  sending,
  onClose,
  onSendMessage,
}: Props) {
  const { user } = useAuth();
  const [myPhoto, setMyPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("profile_photos")
        .select("storage_path")
        .eq("profile_id", user.id)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      const path = (data as { storage_path?: string } | null)?.storage_path;
      if (!path) {
        if (!cancel) setMyPhoto(null);
        return;
      }
      const url = await signPhoto(path, 3600, { width: 360, height: 440, resize: "cover", quality: 80 });
      if (!cancel) setMyPhoto(url || null);
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
          transition={{ duration: 0.28, ease: APPLE_EASE }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center px-7 overflow-hidden"
          onClick={onClose}
          style={{
            paddingTop: "max(env(safe-area-inset-top), 24px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
            background:
              "radial-gradient(140% 90% at 50% 30%, rgba(255,92,138,0.22) 0%, rgba(155,91,255,0.10) 38%, rgba(8,8,12,0.96) 78%)",
            backdropFilter: "blur(32px) saturate(160%)",
          }}
        >
          {/* Entry flash */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.65) 0%, transparent 55%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          {/* Drifting aurora blobs */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[38%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,92,138,0.32), transparent 72%)",
              filter: "blur(60px)",
            }}
            animate={{ scale: [0.95, 1.12, 0.95], opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[38%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(155,91,255,0.28), transparent 72%)",
              filter: "blur(70px)",
            }}
            animate={{
              scale: [1.05, 0.92, 1.05],
              opacity: [0.45, 0.75, 0.45],
              x: [-20, 20, -20],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Shockwave rings — bursting outward on entry */}
          {[0, 0.18, 0.36].map((delay, i) => (
            <motion.span
              key={`ring-${i}`}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[38%] h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                border: "1.5px solid rgba(255,92,138,0.6)",
                boxShadow: "0 0 30px rgba(255,92,138,0.4)",
              }}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.35 + delay, ease: "easeOut" }}
            />
          ))}

          {/* Radial sparkles burst from center */}
          {SPARKS.map((s, i) => (
            <motion.div
              key={`sp-${i}`}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[38%]"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
              animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: [0.4, 1.1, 0.6] }}
              transition={{
                duration: 1.2,
                delay: s.delay,
                ease: "easeOut",
              }}
            >
              <Sparkles
                style={{
                  width: s.size,
                  height: s.size,
                  color: s.hue,
                  filter: `drop-shadow(0 0 8px ${s.hue})`,
                }}
              />
            </motion.div>
          ))}

          {/* Falling confetti */}
          {CONFETTI.map((c, i) => (
            <motion.span
              key={`cf-${i}`}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[30%] block rounded-[2px]"
              style={{
                width: c.size,
                height: c.size * 0.4,
                background: c.hue,
                boxShadow: `0 0 10px ${c.hue}80`,
              }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
              animate={{
                x: c.x,
                y: 520,
                opacity: [0, 1, 1, 0],
                rotate: c.rot,
              }}
              transition={{
                duration: c.dur,
                delay: c.delay,
                ease: [0.2, 0.6, 0.4, 1],
                repeat: Infinity,
                repeatDelay: 2.2,
              }}
            />
          ))}

          {/* Sparse drifting hearts */}
          {[
            { x: -150, delay: 0.2, size: 14, dur: 4.6 },
            { x: 130, delay: 1.2, size: 11, dur: 5.2 },
            { x: -50, delay: 2.4, size: 16, dur: 4.8 },
            { x: 80, delay: 3.0, size: 12, dur: 5.4 },
            { x: -100, delay: 3.6, size: 10, dur: 5.0 },
          ].map((h, i) => (
            <motion.div
              key={`hd-${i}`}
              aria-hidden
              className="pointer-events-none absolute bottom-[22%]"
              style={{ left: `calc(50% + ${h.x}px)` }}
              initial={{ y: 0, opacity: 0, rotate: -8 }}
              animate={{
                y: -260,
                opacity: [0, 0.9, 0],
                rotate: [-8, 8, -4],
                x: [0, 14, -10, 0],
              }}
              transition={{
                duration: h.dur,
                delay: h.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            >
              <Heart
                fill={ROSE}
                stroke="none"
                style={{
                  width: h.size,
                  height: h.size,
                  filter: "drop-shadow(0 4px 10px rgba(255,92,138,0.65))",
                }}
              />
            </motion.div>
          ))}

          <div
            className="relative flex w-full max-w-[340px] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photos */}
            <div className="relative mb-9 h-[188px] w-[280px]">
              <PhotoBubble
                src={myPhoto}
                fallbackInitial="Tu"
                className="left-0 top-2"
                rotate={-6}
                delay={0.12}
                fromX={-60}
              />
              <PhotoBubble
                src={targetPhoto ?? null}
                fallbackInitial={targetName[0] ?? "?"}
                className="right-0 top-2"
                rotate={6}
                delay={0.22}
                fromX={60}
              />
              {/* Center heart badge — bouncy reveal + heartbeat + halo */}
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  delay: 0.45,
                  type: "spring",
                  stiffness: 340,
                  damping: 14,
                  mass: 0.9,
                }}
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
              >
                {/* Pulsing halo */}
                <motion.span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    boxShadow: `0 0 0 0 ${ROSE}80`,
                  }}
                  animate={{
                    boxShadow: [
                      `0 0 0 0 ${ROSE}80`,
                      `0 0 0 26px ${ROSE}00`,
                    ],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                />
                <div
                  className="grid h-[60px] w-[60px] place-items-center rounded-full"
                  style={{
                    background: `linear-gradient(150deg, ${ROSE} 0%, ${PLUM} 100%)`,
                    boxShadow:
                      "0 20px 44px -10px rgba(255,92,138,0.7), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -8px 18px rgba(0,0,0,0.18)",
                    border: "2.5px solid #0a0a12",
                  }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.22, 0.96, 1.14, 1] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.8,
                    }}
                  >
                    <Heart
                      className="h-[26px] w-[26px] text-white"
                      fill="currentColor"
                      strokeWidth={0}
                      style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18))" }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 6, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.24em" }}
              transition={{ delay: 0.78, duration: 0.6, ease: APPLE_EASE }}
              className="flex items-center gap-2.5"
            >
              <span
                aria-hidden
                className="h-px w-6"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.4))",
                }}
              />
              <span className="text-[10.5px] font-semibold uppercase text-white/55">
                It's a match
              </span>
              <span
                aria-hidden
                className="h-px w-6"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.4), transparent)",
                }}
              />
            </motion.div>

            {/* Title — char-by-char bouncy reveal */}
            <h2
              className="mt-3 text-center text-[44px] font-bold leading-[1.02] tracking-[-0.035em]"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
                backgroundImage:
                  "linear-gradient(180deg, #FFFFFF 0%, #FFE3EC 70%, #FFC2D8 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 2px 12px rgba(255,92,138,0.3))",
              }}
            >
              {"É um match".split("").map((c, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={{ opacity: 0, y: 28, scale: 0.5, rotate: -10 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                  transition={{
                    delay: 0.85 + i * 0.05,
                    type: "spring",
                    stiffness: 360,
                    damping: 16,
                    mass: 0.7,
                  }}
                >
                  {c === " " ? "\u00A0" : c}
                </motion.span>
              ))}
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.4, ease: APPLE_EASE }}
              className="mt-3 max-w-[300px] text-center text-[14.5px] leading-[1.45] text-white/65"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
                letterSpacing: "-0.005em",
              }}
            >
              Tu e{" "}
              <span className="font-semibold text-white/90">{targetName}</span>{" "}
              gostam-se. Manda já o primeiro recado.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 1.55,
                type: "spring",
                stiffness: 300,
                damping: 24,
              }}
              className="mt-8 flex w-full max-w-[320px] flex-col gap-2.5"
            >
              <motion.button
                type="button"
                onClick={onSendMessage}
                disabled={sending}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.015, y: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-full text-[15px] font-semibold text-white disabled:opacity-70"
                style={{
                  background: `linear-gradient(150deg, ${ROSE} 0%, ${PLUM} 100%)`,
                  boxShadow:
                    "0 18px 36px -14px rgba(255,92,138,0.7), 0 2px 0 rgba(255,255,255,0.10) inset, 0 -10px 22px rgba(0,0,0,0.18) inset",
                  letterSpacing: "-0.01em",
                }}
              >
                {/* Specular highlight */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 100%)",
                  }}
                />
                {/* Shine sweep */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                    filter: "blur(2px)",
                  }}
                  animate={{ x: ["-150%", "350%"] }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 1.4,
                  }}
                />
                <MessageCircle
                  className="relative h-[17px] w-[17px]"
                  strokeWidth={2.4}
                />
                <span className="relative">
                  {sending ? "A abrir conversa…" : "Enviar mensagem"}
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="inline-flex h-[46px] items-center justify-center rounded-full text-[14px] font-medium text-white/75"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  letterSpacing: "-0.005em",
                }}
              >
                Continuar a descobrir
              </motion.button>
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
  fromX = 0,
}: {
  src: string | null;
  fallbackInitial: string;
  className?: string;
  rotate: number;
  delay: number;
  fromX?: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0, y: 40, x: fromX, rotate: rotate * 3 }}
      animate={{ scale: 1, opacity: 1, y: 0, x: 0, rotate }}
      transition={{
        delay,
        type: "spring",
        stiffness: 260,
        damping: 16,
        mass: 0.95,
      }}
      whileHover={{ scale: 1.04, rotate: rotate * 0.4 }}
      className={`absolute h-[178px] w-[144px] overflow-hidden rounded-[30px] ${className ?? ""}`}
      style={{
        boxShadow:
          "0 30px 60px -20px rgba(0,0,0,0.75), 0 0 0 0.5px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="grid h-full w-full place-items-center text-3xl font-semibold tracking-tight text-white/90"
          style={{
            background: `linear-gradient(150deg, ${ROSE} 0%, ${PLUM} 100%)`,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
          }}
        >
          {fallbackInitial.toUpperCase()}
        </div>
      )}
      {/* Inner gloss + animated shine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[30px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.20) 100%)",
        }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
        }}
        initial={{ x: "-150%" }}
        animate={{ x: "250%" }}
        transition={{
          duration: 1.8,
          delay: delay + 0.6,
          ease: "easeOut",
        }}
      />
    </motion.div>
  );
}
