import { RotateCcw, X, Star, Heart, Zap } from "lucide-react";
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
  border: "none",
  cursor: "pointer",
  background: "rgba(20,20,20,0.85)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow:
    "0 6px 18px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)",
  transition: "transform 120ms cubic-bezier(0.22,1,0.36,1)",
  WebkitTapHighlightColor: "transparent",
};

export const SwipeActions = ({
  onSwipe,
  onRewind,
  onBoost,
  canRewind = true,
  canBoost = true,
  boostActive = false,
  boostRemainingMinutes = 0,
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
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px 22px",
      }}
    >
      <button
        onClick={press(onRewind)}
        disabled={!canRewind}
        aria-label="Rewind"
        style={{ ...baseBtn, width: 48, height: 48, opacity: canRewind ? 1 : 0.45 }}
      >
        <RotateCcw size={20} color="#FFB84D" strokeWidth={2.6} />
      </button>

      <button
        onClick={press(() => onSwipe("left"))}
        aria-label="Pass"
        style={{ ...baseBtn, width: 64, height: 64 }}
      >
        <X size={32} color="#FF4458" strokeWidth={3} />
      </button>

      <button
        onClick={press(() => onSwipe("up"))}
        aria-label="Super like"
        style={{ ...baseBtn, width: 56, height: 56 }}
      >
        <Star size={24} color="#1FB8FF" strokeWidth={2.6} fill="#1FB8FF" />
      </button>

      <button
        onClick={press(() => onSwipe("right"))}
        aria-label="Like"
        style={{ ...baseBtn, width: 64, height: 64 }}
      >
        <Heart size={30} color="#19D27E" strokeWidth={2.6} fill="#19D27E" />
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
          background: boostActive
            ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
            : baseBtn.background,
          position: "relative",
        }}
      >
        <Zap
          size={20}
          color={boostActive ? "#fff" : "#8B5CF6"}
          strokeWidth={2.6}
          fill={boostActive ? "#fff" : "transparent"}
        />
        {boostActive && boostRemainingMinutes > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              fontSize: 10,
              fontWeight: 800,
              color: "#fff",
              background: "#8B5CF6",
              padding: "2px 5px",
              borderRadius: 10,
              lineHeight: 1,
            }}
          >
            {boostRemainingMinutes}m
          </span>
        )}
      </button>
    </div>
  );
};
