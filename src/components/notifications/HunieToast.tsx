import { memo } from "react";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { Check, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface HunieToastProps {
  toastId: string | number;
  title: string;
  body: string;
  type?: ToastType;
  onDismiss: () => void;
}

const iconMap = {
  success: Check,
  error: AlertCircle,
  info: Info,
};

const typeStyles: Record<ToastType, { ring: string; icon: string; glow: string }> = {
  success: {
    ring: "ring-emerald-400/25",
    icon: "text-emerald-400",
    glow: "shadow-[0_0_20px_-4px_rgba(52,211,153,0.35)]",
  },
  error: {
    ring: "ring-rose-400/25",
    icon: "text-rose-400",
    glow: "shadow-[0_0_20px_-4px_rgba(251,113,133,0.35)]",
  },
  info: {
    ring: "ring-fuchsia-400/25",
    icon: "text-fuchsia-400",
    glow: "shadow-[0_0_20px_-4px_rgba(232,121,249,0.35)]",
  },
};

function HunieToastBase({
  title,
  body,
  type = "info",
  onDismiss,
}: HunieToastProps) {
  const Icon = iconMap[type];
  const styles = typeStyles[type];

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        initial={{ y: -16, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -12, opacity: 0, scale: 0.98, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }}
        transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.6 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.y < -24 || info.velocity.y < -320) onDismiss();
        }}
        role="button"
        tabIndex={0}
        style={{ willChange: "transform, opacity" }}
        className="pointer-events-auto w-[min(92vw,360px)] cursor-pointer select-none touch-none"
        onClick={onDismiss}
      >
        <div
          className={`relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.06] backdrop-blur-xl ring-1 ${styles.ring} ${styles.glow}`}
        >
          {/* Top sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/6`}>
              <Icon size={14} className={styles.icon} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight tracking-[-0.01em] text-white">
                {title}
              </p>
              <p className="mt-[1px] truncate text-[12px] leading-snug text-white/60">
                {body}
              </p>
            </div>
          </div>

          {/* Bottom hairline */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"
          />
        </div>
      </m.div>
    </LazyMotion>
  );
}

export const HunieToast = memo(HunieToastBase);
