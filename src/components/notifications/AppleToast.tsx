import { motion } from "framer-motion";
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

export function AppleToast({
  title,
  body,
  avatar,
  appName = "Hunie",
  timeLabel = "agora",
  onClick,
  onDismiss,
}: AppleToastProps) {
  return (
    <motion.div
      layout
      initial={{ y: -24, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -24, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.8 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.6, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -40 || info.velocity.y < -300) onDismiss();
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="pointer-events-auto w-[min(94vw,380px)] cursor-pointer select-none"
    >
      <div
        className="flex items-start gap-2.5 rounded-[22px] border border-white/10 px-3 py-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
        style={{
          backgroundColor: "color-mix(in oklab, hsl(var(--background)) 65%, transparent)",
        }}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[10px] bg-muted ring-1 ring-white/10">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <img src={flameIcon} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
              {title}
            </p>
            <span className="ml-auto shrink-0 text-[11px] font-medium text-foreground/50">
              {timeLabel}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/45">
            {appName}
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-foreground/85">
            {body}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
