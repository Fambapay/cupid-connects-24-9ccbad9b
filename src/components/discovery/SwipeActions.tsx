import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { RotateCcw, X, Star, Heart, Send } from "lucide-react";
import type { SwipeDirection, DailyLimits } from "./types";

interface SwipeActionsProps {
  onSwipe: (d: SwipeDirection) => void;
  onRewind?: () => void;
  onFirstImpression?: () => void;
  dailyLimits?: DailyLimits;
  canRewind?: boolean;
  boostActive?: boolean;
  boostRemainingMinutes?: number;
  dragX?: MotionValue<number>;
  dragY?: MotionValue<number>;
}

const baseBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.06)",
  cursor: "pointer",
  background: "rgba(14,14,18,0.78)",
  backdropFilter: "blur(18px) saturate(160%)",
  WebkitBackdropFilter: "blur(18px) saturate(160%)",
  boxShadow:
    "0 8px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
  transition:
    "box-shadow 140ms ease, border-color 140ms ease",
  WebkitTapHighlightColor: "transparent",
};

const RESET_SHADOW =
  "0 8px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)";
const RESET_BORDER = "rgba(255,255,255,0.06)";

export const SwipeActions = ({
  onSwipe,
  onRewind,
  onFirstImpression,
  canRewind = true,
  dragX,
  dragY,
}: SwipeActionsProps) => {
  const passRef = useRef<HTMLButtonElement>(null);
  const likeRef = useRef<HTMLButtonElement>(null);
  const superRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dragX && !dragY) return;
    let raf: number | null = null;
    const apply = () => {
      raf = null;
      const w = typeof window !== "undefined" ? window.innerWidth : 390;
      const dx = dragX?.get() ?? 0;
      const dy = dragY?.get() ?? 0;
      const t = w * 0.25;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 180));

      const paint = (
        el: HTMLButtonElement | null,
        p: number,
        color: string,
      ) => {
        if (!el) return;
        const scale = 1 + p * 0.22;
        el.style.transform = `scale(${scale.toFixed(3)})`;
        if (p > 0.02) {
          el.style.boxShadow = `0 10px 30px ${color}, inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 ${(p * 2).toFixed(1)}px ${color}`;
          el.style.borderColor = color;
        } else {
          el.style.boxShadow = RESET_SHADOW;
          el.style.borderColor = RESET_BORDER;
        }
      };
      paint(passRef.current, nope, "rgba(255,59,78,0.55)");
      paint(likeRef.current, like, "rgba(25,210,126,0.55)");
      paint(superRef.current, sup, "rgba(31,184,255,0.55)");
    };
    const schedule = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(apply);
    };
    const unsubs: Array<() => void> = [];
    if (dragX) unsubs.push(dragX.on("change", schedule));
    if (dragY) unsubs.push(dragY.on("change", schedule));
    apply();
    return () => {
      unsubs.forEach((u) => u());
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [dragX, dragY]);

  const press =
    (cb?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      el.style.transition =
        "transform 120ms cubic-bezier(0.22,1,0.36,1), box-shadow 140ms ease, border-color 140ms ease";
      el.style.transform = "scale(0.92)";
      setTimeout(() => {
        el.style.transform = "";
        el.style.transition =
          "box-shadow 140ms ease, border-color 140ms ease";
      }, 120);
      cb?.();
    };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px 18px",
        background:
          "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0) 100%)",
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={press(onRewind)}
        disabled={!canRewind}
        aria-label="Rewind"
        style={{ ...baseBtn, width: 48, height: 48, opacity: canRewind ? 1 : 0.45 }}
      >
        <RotateCcw size={20} color="#F4A23B" strokeWidth={2.6} />
      </button>

      <button
        ref={passRef}
        onClick={press(() => onSwipe("left"))}
        aria-label="Pass"
        style={{ ...baseBtn, width: 60, height: 60, willChange: "transform" }}
      >
        <X size={30} color="#FFFFFF" strokeWidth={3} />
      </button>

      <button
        ref={superRef}
        onClick={press(() => onSwipe("up"))}
        aria-label="Super like"
        style={{ ...baseBtn, width: 56, height: 56, willChange: "transform" }}
      >
        <Star size={24} color="#A8B5E8" strokeWidth={2.4} fill="transparent" />
      </button>

      <button
        ref={likeRef}
        onClick={press(() => onSwipe("right"))}
        aria-label="Like"
        style={{ ...baseBtn, width: 60, height: 60, willChange: "transform" }}
      >
        <Heart size={28} color="#FF3B4E" strokeWidth={2.4} fill="#FF3B4E" />
      </button>

      <button
        onClick={press(onFirstImpression)}
        aria-label="First Impression"
        style={{
          ...baseBtn,
          width: 48,
          height: 48,
        }}
      >
        <Send size={20} color="#4FA8FF" strokeWidth={2.4} style={{ transform: "translateX(-1px)" }} />
      </button>
    </div>
  );
};
