import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signPhoto } from "@/lib/photos";
import { match as matchMotion, spring } from "@/lib/motion";
import { Stagger, StaggerItem, PressableScale } from "@/components/motion";

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

// Apple-style ease used throughout
const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

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
  const reduce = useReducedMotion();

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
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={reduce ? { duration: 0.2 } : spring.smooth}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center px-7"
          onClick={onClose}
          style={{
            paddingTop: "max(env(safe-area-inset-top), 24px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
            background:
              "radial-gradient(140% 90% at 50% 30%, rgba(255,92,138,0.22) 0%, rgba(155,91,255,0.10) 38%, rgba(8,8,12,0.96) 78%)",
            backdropFilter: "blur(32px) saturate(160%)",
          }}
        >
          {/* Single soft aura — refined, no neon */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[38%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,92,138,0.28), transparent 72%)",
              filter: "blur(60px)",
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Sparse drifting hearts — restrained */}
          {[
            { x: -120, delay: 0.2, size: 12, dur: 5 },
            { x: 110, delay: 1.4, size: 10, dur: 5.6 },
            { x: -40, delay: 2.6, size: 14, dur: 5.2 },
          ].map((h, i) => (
            <motion.div
              key={i}
              aria-hidden
              className="pointer-events-none absolute bottom-[28%]"
              style={{ left: `calc(50% + ${h.x}px)` }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -220, opacity: [0, 0.85, 0] }}
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
                  filter: "drop-shadow(0 4px 10px rgba(255,92,138,0.55))",
                }}
              />
            </motion.div>
          ))}

          <div
            className="relative flex w-full max-w-[340px] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photos — meet in the centre from opposite sides with spring settle. */}
            <div
              className="relative mb-9 h-[188px]"
              style={{ width: 144 * 2 - matchMotion.photoOverlap }}
            >
              <PhotoBubble
                src={myPhoto}
                fallbackInitial="Tu"
                className="left-0 top-2"
                rotate={-4}
                fromSide="left"
                delay={reduce ? 0.1 : 0.12}
                reduce={!!reduce}
              />
              <PhotoBubble
                src={targetPhoto ?? null}
                fallbackInitial={targetName[0] ?? "?"}
                className="right-0 top-2"
                rotate={4}
                fromSide="right"
                delay={reduce ? 0.15 : 0.18}
                reduce={!!reduce}
              />
              {/* Center heart badge — pulse subtil quando o título aparece. */}
              <motion.div
                initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                animate={
                  reduce
                    ? { opacity: 1 }
                    : { scale: [0, 1.1, 1], opacity: [0, 1, 1] }
                }
                transition={
                  reduce
                    ? { delay: 0.45, duration: 0.2 }
                    : { delay: 0.45, duration: 0.55, times: [0, 0.6, 1], ease: [0.32, 0.72, 0, 1] }
                }
                className="absolute left-1/2 top-1/2 z-10 grid h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                style={{
                  background: `linear-gradient(150deg, ${ROSE} 0%, ${PLUM} 100%)`,
                  boxShadow:
                    "0 20px 44px -10px rgba(255,92,138,0.65), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -8px 18px rgba(0,0,0,0.18)",
                  border: "2.5px solid #0a0a12",
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


            {/* Eyebrow — refined, monochrome */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.4, ease: APPLE_EASE }}
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
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/55">
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

            {/* Title — bounce pop after photos settle. */}
            <motion.h2
              initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={
                reduce
                  ? { delay: 0.5, duration: 0.25 }
                  : { delay: 0.5, ...matchMotion.titlePop }
              }
              className="mt-3 text-center text-[44px] font-bold leading-[1.02] tracking-[-0.035em]"
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
                backgroundImage:
                  "linear-gradient(180deg, #FFFFFF 0%, #FFE3EC 70%, #FFC2D8 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 2px 12px rgba(255,92,138,0.25))",
              }}
            >
              É um match
            </motion.h2>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4, ease: APPLE_EASE }}
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

            {/* Buttons — stagger in last. Orquestração declarativa via delay,
                nunca setTimeout (sincroniza com o clock do Framer Motion). */}
            <Stagger
              stagger={0.08}
              className="mt-8 flex w-full max-w-[320px] flex-col gap-2.5"
              transition={{ delayChildren: 0.75 }}
            >
              <StaggerItem>
                <PressableScale className="w-full">
                  <button
                    type="button"
                    onClick={onSendMessage}
                    disabled={sending}
                    className="group relative inline-flex h-[52px] w-full items-center justify-center gap-2 overflow-hidden rounded-full text-[15px] font-semibold text-white disabled:opacity-70"
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
                    <MessageCircle
                      className="relative h-[17px] w-[17px]"
                      strokeWidth={2.4}
                    />
                    <span className="relative">
                      {sending ? "A abrir conversa…" : "Enviar mensagem"}
                    </span>
                  </button>
                </PressableScale>
              </StaggerItem>

              <StaggerItem>
                <PressableScale className="w-full">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-[46px] w-full items-center justify-center rounded-full text-[14px] font-medium text-white/75"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "0.5px solid rgba(255,255,255,0.12)",
                      backdropFilter: "blur(20px) saturate(180%)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    Continuar a descobrir
                  </button>
                </PressableScale>
              </StaggerItem>
            </Stagger>
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
  fromSide,
  delay,
  reduce,
}: {
  src: string | null;
  fallbackInitial: string;
  className?: string;
  rotate: number;
  fromSide: "left" | "right";
  delay: number;
  reduce: boolean;
}) {
  const initial = reduce
    ? { opacity: 0, rotate }
    : {
        x: fromSide === "left" ? "-120%" : "120%",
        rotate: fromSide === "left" ? -8 : 8,
        opacity: 0,
      };
  const animate = reduce
    ? { opacity: 1, rotate }
    : { x: 0, rotate, opacity: 1 };
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={
        reduce
          ? { delay, duration: 0.3 }
          : { delay, ...matchMotion.photoSettle }
      }
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
      {/* Subtle inner gloss */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[30px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.20) 100%)",
        }}
      />
    </motion.div>
  );
}

