import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signPhoto } from "@/lib/photos";

const ROSE = "#FF5C8A";
const PLUM = "#9B5BFF";

// Module-level cache so the user's own photo is fetched once per session
// and is instantly available when a match overlay opens.
const myPhotoCache = new Map<string, string>();

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
  const [myPhoto, setMyPhoto] = useState<string | null>(() =>
    user ? myPhotoCache.get(user.id) ?? null : null,
  );

  // Prefetch on mount (not just when open) so the photo is ready instantly when a match happens.
  useEffect(() => {
    if (!user) return;
    const cached = myPhotoCache.get(user.id);
    if (cached) {
      setMyPhoto(cached);
      return;
    }
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
      if (!path) return;
      const url = await signPhoto(path, 3600, { width: 360, height: 440, resize: "cover", quality: 80 });
      if (!cancel && url) {
        myPhotoCache.set(user.id, url);
        // Warm the browser image cache.
        const img = new Image();
        img.src = url;
        setMyPhoto(url);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  // Warm target photo as soon as we know it (before overlay opens).
  useEffect(() => {
    if (!targetPhoto) return;
    const img = new Image();
    img.src = targetPhoto;
  }, [targetPhoto]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="match-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: APPLE_EASE }}
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
            {/* Photos */}
            <div className="relative mb-9 h-[188px] w-[280px]">
              <PhotoBubble
                src={myPhoto}
                fallbackInitial="Tu"
                className="left-0 top-2"
                rotate={-6}
                delay={0.12}
              />
              <PhotoBubble
                src={targetPhoto ?? null}
                fallbackInitial={targetName[0] ?? "?"}
                className="right-0 top-2"
                rotate={6}
                delay={0.22}
              />
              {/* Center heart badge — Apple capsule */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.5,
                  type: "spring",
                  stiffness: 320,
                  damping: 22,
                  mass: 0.8,
                }}
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

            {/* Title — refined gradient, tighter tracking */}
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.7,
                type: "spring",
                stiffness: 260,
                damping: 24,
              }}
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.78, duration: 0.4, ease: APPLE_EASE }}
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.92, duration: 0.45, ease: APPLE_EASE }}
              className="mt-8 flex w-full max-w-[320px] flex-col gap-2.5"
            >
              <button
                type="button"
                onClick={onSendMessage}
                disabled={sending}
                className="group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-full text-[15px] font-semibold text-white transition-transform active:scale-[0.975] disabled:opacity-70"
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

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-[46px] items-center justify-center rounded-full text-[14px] font-medium text-white/75 transition-transform active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  letterSpacing: "-0.005em",
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
      initial={{ scale: 0.5, opacity: 0, y: 24, rotate: 0 }}
      animate={{ scale: 1, opacity: 1, y: 0, rotate }}
      transition={{
        delay,
        type: "spring",
        stiffness: 240,
        damping: 22,
        mass: 0.85,
      }}
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
