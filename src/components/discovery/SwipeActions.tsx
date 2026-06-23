import { useEffect, useRef } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
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
  transition: "transform 120ms cubic-bezier(0.22,1,0.36,1), box-shadow 160ms ease, border-color 160ms ease, background 160ms ease",
  WebkitTapHighlightColor: "transparent",
};

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
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dragX && !dragY) return;
    const apply = () => {
      rafRef.current = null;
      const w = typeof window !== "undefined" ? window.innerWidth : 390;
      const dx = dragX?.get() ?? 0;
      const dy = dragY?.get() ?? 0;
      const t = w * 0.25;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 180));

      const style = (
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
          el.style.boxShadow =
            "0 8px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)";
          el.style.borderColor = "rgba(255,255,255,0.06)";
        }
      };
      style(passRef.current, nope, "rgba(255,59,78,0.55)");
      style(likeRef.current, like, "rgba(25,210,126,0.55)");
      style(superRef.current, sup, "rgba(31,184,255,0.55)");
    };
    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(apply);
    };
    apply();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [dragX, dragY]);

  useMotionValueEvent(dragX ?? ({ get: () => 0, on: () => () => {} } as unknown as MotionValue<number>), "change", () => {
    if (!dragX) return;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const w = typeof window !== "undefined" ? window.innerWidth : 390;
      const dx = dragX.get();
      const dy = dragY?.get() ?? 0;
      const t = w * 0.25;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 180));
      const apply = (el: HTMLButtonElement | null, p: number, color: string) => {
        if (!el) return;
        const scale = 1 + p * 0.22;
        el.style.transform = `scale(${scale.toFixed(3)})`;
        if (p > 0.02) {
          el.style.boxShadow = `0 10px 30px ${color}, inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 ${(p * 2).toFixed(1)}px ${color}`;
          el.style.borderColor = color;
        } else {
          el.style.boxShadow =
            "0 8px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)";
          el.style.borderColor = "rgba(255,255,255,0.06)";
        }
      };
      apply(passRef.current, nope, "rgba(255,59,78,0.55)");
      apply(likeRef.current, like, "rgba(25,210,126,0.55)");
      apply(superRef.current, sup, "rgba(31,184,255,0.55)");
    });
  });
  useMotionValueEvent(dragY ?? ({ get: () => 0, on: () => () => {} } as unknown as MotionValue<number>), "change", () => {
    if (!dragY) return;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const w = typeof window !== "undefined" ? window.innerWidth : 390;
      const dx = dragX?.get() ?? 0;
      const dy = dragY.get();
      const t = w * 0.25;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 180));
      const apply = (el: HTMLButtonElement | null, p: number, color: string) => {
        if (!el) return;
        const scale = 1 + p * 0.22;
        el.style.transform = `scale(${scale.toFixed(3)})`;
        if (p > 0.02) {
          el.style.boxShadow = `0 10px 30px ${color}, inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 ${(p * 2).toFixed(1)}px ${color}`;
          el.style.borderColor = color;
        } else {
          el.style.boxShadow =
            "0 8px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)";
          el.style.borderColor = "rgba(255,255,255,0.06)";
        }
      };
      apply(passRef.current, nope, "rgba(255,59,78,0.55)");
      apply(likeRef.current, like, "rgba(25,210,126,0.55)");
      apply(superRef.current, sup, "rgba(31,184,255,0.55)");
    });
  });

  const press =
    (cb?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      const prev = el.style.transform;
      el.style.transform = "scale(0.92)";
      setTimeout(() => {
        el.style.transform = prev || "";
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
        style={{ ...baseBtn, width: 60, height: 60 }}
      >
        <X size={30} color="#FFFFFF" strokeWidth={3} />
      </button>

      <button
        ref={superRef}
        onClick={press(() => onSwipe("up"))}
        aria-label="Super like"
        style={{ ...baseBtn, width: 56, height: 56 }}
      >
        <Star size={24} color="#A8B5E8" strokeWidth={2.4} fill="transparent" />
      </button>

      <button
        ref={likeRef}
        onClick={press(() => onSwipe("right"))}
        aria-label="Like"
        style={{ ...baseBtn, width: 60, height: 60 }}
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
