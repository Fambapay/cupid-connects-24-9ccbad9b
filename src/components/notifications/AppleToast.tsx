import { memo } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import flameAsset from "@/assets/hunie-logo.png.asset.json";

const flameIcon = flameAsset.url;

interface AppleToastProps {
  toastId: string | number;
  title: string;
  body: string;
  avatar?: string;
  appName?: string;
  timeLabel?: string;
  onClick?: () => void;
  onDismiss: () => void;
}

// Apple-style notification: frosted glass, subtle inner highlight,
// springy entry, swipe-up to dismiss. Memoized + LazyMotion for perf.
function AppleToastBase({
  title,
  body,
  avatar,
  appName = "Hunie",
  timeLabel = "agora",
  onClick,
  onDismiss,
}: AppleToastProps) {
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
        onClick={onClick}
        role="button"
        tabIndex={0}
        style={{ willChange: "transform, opacity" }}
        className="pointer-events-auto w-[min(94vw,384px)] cursor-pointer select-none touch-none"
      >
        {/* Glass card */}
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
          {/* Top sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, white 40%, transparent), transparent)",
            }}
          />

          <div className="flex items-start gap-2.5 px-3.5 py-3">
            {/* Avatar — clean iOS squircle */}
            <div className="relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-[10px] bg-white/5 ring-1 ring-white/10">
              <img
                src={avatar || flameIcon}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[12px] font-medium tracking-[0.01em] text-foreground/55">
                  {appName}
                </p>
                <span className="ml-auto shrink-0 text-[12px] font-medium tabular-nums text-foreground/45">
                  {timeLabel}
                </span>
              </div>

              <p className="mt-[1px] truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
                {title}
              </p>
              <p className="mt-[1px] line-clamp-2 text-[14px] leading-snug text-foreground/85">
                {body}
              </p>
            </div>
          </div>


          {/* Bottom hairline */}
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

export const AppleToast = memo(AppleToastBase);
