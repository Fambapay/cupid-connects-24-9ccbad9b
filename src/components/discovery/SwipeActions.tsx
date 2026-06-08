import { RotateCcw, X, Star, Heart, Send } from "lucide-react";
import type { SwipeDirection, DailyLimits } from "./types";

interface SwipeActionsProps {
  onSwipe: (d: SwipeDirection) => void;
  onRewind?: () => void;
  onBoost?: () => void;
  dailyLimits?: DailyLimits;
  canRewind?: boolean;
  canBoost?: boolean;
  boostActive?: boolean;
  boostRemainingMinutes?: number;
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
  transition: "transform 120ms cubic-bezier(0.22,1,0.36,1)",
  WebkitTapHighlightColor: "transparent",
};

export const SwipeActions = ({
  onSwipe,
  onRewind,
  onBoost,
  canRewind = true,
  canBoost = true,
}: SwipeActionsProps) => {
  const press =
    (cb?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      el.style.transform = "scale(0.92)";
      setTimeout(() => {
        el.style.transform = "";
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
        onClick={press(() => onSwipe("left"))}
        aria-label="Pass"
        style={{ ...baseBtn, width: 60, height: 60 }}
      >
        <X size={30} color="#FFFFFF" strokeWidth={3} />
      </button>

      <button
        onClick={press(() => onSwipe("up"))}
        aria-label="Super like"
        style={{ ...baseBtn, width: 56, height: 56 }}
      >
        <Star size={24} color="#A8B5E8" strokeWidth={2.4} fill="transparent" />
      </button>

      <button
        onClick={press(() => onSwipe("right"))}
        aria-label="Like"
        style={{ ...baseBtn, width: 60, height: 60 }}
      >
        <Heart size={28} color="#FF3B4E" strokeWidth={2.4} fill="#FF3B4E" />
      </button>

      <button
        onClick={press(onBoost)}
        disabled={!canBoost}
        aria-label="Boost"
        style={{
          ...baseBtn,
          width: 48,
          height: 48,
          opacity: canBoost ? 1 : 0.45,
        }}
      >
        <Send size={20} color="#4FA8FF" strokeWidth={2.4} style={{ transform: "translateX(-1px)" }} />
      </button>
    </div>
  );
};
