import { memo } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Lock, Heart, Sparkles } from "lucide-react";

interface LikeRevealToastProps {
  toastId: string | number;
  count?: number;
  isSuper?: boolean;
  onReveal: () => void;
  onDismiss: () => void;
}

/**
 * Free-tier like notification: no photo, no name. Blurred silhouette +
 * CTA to Hunie Select. Tapping the card opens membership/checkout.
 */
function LikeRevealToastBase({
  count = 1,
  isSuper = false,
  onReveal,
  onDismiss,
}: LikeRevealToastProps) {
  const title = isSuper ? "Super Like ⭐" : count > 1 ? `${count} pessoas deram-te like` : "1 pessoa deu-te like";

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        initial={{ y: -28, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -28, opacity: 0, scale: 0.96, transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y < -32 || info.velocity.y < -380) onDismiss();
        }}
        style={{ willChange: "transform, opacity" }}
        className="pointer-events-auto w-[min(94vw,384px)] select-none touch-none"
      >
        <div
          className="relative overflow-hidden rounded-[22px]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--background) 78%, transparent) 0%, color-mix(in oklab, var(--background) 92%, transparent) 100%)",
            boxShadow:
              "0 1px 0 0 color-mix(in oklab, white 14%, transparent) inset, 0 0 0 1px color-mix(in oklab, white 6%, transparent), 0 24px 48px -16px rgba(0,0,0,0.55), 0 8px 18px -8px rgba(0,0,0,0.35)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, white 40%, transparent), transparent)",
            }}
          />

          <button
            type="button"
            onClick={onReveal}
            className="flex w-full items-start gap-3 px-3.5 py-3 text-left active:scale-[0.995] transition-transform"
          >
            {/* Blurred silhouette avatar */}
            <div className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[12px] ring-1 ring-white/12">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)",
                  filter: "blur(6px) saturate(140%)",
                  transform: "scale(1.4)",
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-black/40 ring-1 ring-white/25">
                  <Lock className="h-3 w-3 text-white" strokeWidth={2.6} />
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[12px] font-medium tracking-[0.01em] text-foreground/55">
                  Hunie
                </p>
                <span className="ml-auto shrink-0 text-[12px] font-medium tabular-nums text-foreground/45">
                  agora
                </span>
              </div>

              <p className="mt-[1px] flex items-center gap-1.5 truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
                <Heart className="h-3.5 w-3.5 text-flame" fill="currentColor" />
                {title}
              </p>
              <p className="mt-[2px] line-clamp-2 text-[13px] leading-snug text-foreground/75">
                Adere ao Hunie Select para revelares quem foi.
              </p>

              <div
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white"
                style={{
                  backgroundImage: "linear-gradient(135deg, #FF4FA3 0%, #B13CFF 100%)",
                  boxShadow:
                    "0 8px 20px -8px color-mix(in oklab, var(--brand-pink) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}
              >
                <Sparkles className="h-3 w-3" />
                Revelar quem deu like
              </div>
            </div>
          </button>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, white 10%, transparent), transparent)",
            }}
          />
        </div>
      </m.div>
    </LazyMotion>
  );
}

export const LikeRevealToast = memo(LikeRevealToastBase);
