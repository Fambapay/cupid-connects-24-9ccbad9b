import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { RotateCcw, X, Star, Heart, MessageSquarePlus, Lock } from "lucide-react";
import type { SwipeDirection, DailyLimits } from "./types";
import { hapticTap } from "@/hooks/useNativePlatform";

interface SwipeActionsProps {
  onSwipe: (d: SwipeDirection) => void;
  onRewind?: () => void;
  onFirstImpression?: () => void;
  dailyLimits?: DailyLimits;
  canRewind?: boolean;
  boostActive?: boolean;
  boostRemainingMinutes?: number;
  /** Premium unlocks rewind. Free users still see the button (opens paywall). */
  isPremium?: boolean;
  /** Balance shown as small badge on the Super Like button. */
  superLikeBalance?: number;
  /** Balance shown as small badge on the First Impression button. */
  firstImpressionBalance?: number;
  dragX?: MotionValue<number>;
  dragY?: MotionValue<number>;
}

// Apple-style ease (used in SwiftUI .easeInOut variants)
const ease = (p: number) => {
  // smootherstep — symmetrical, zero 1st & 2nd derivative at endpoints
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return p * p * p * (p * (p * 6 - 15) + 10);
};

type Tone = {
  /** rgb triplet string */
  fill: string;
  /** resting icon color (hex) */
  rest: string;
};

const TONES: Record<"pass" | "like" | "sup", Tone> = {
  pass: { fill: "255,69,89", rest: "#FFFFFF" },
  like: { fill: "48,209,88", rest: "#FF3B4E" },
  sup: { fill: "10,160,255", rest: "#A8B5E8" },
};

const BTN_BASE: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "0.5px solid rgba(255,255,255,0.10)",
  cursor: "pointer",
  background: "rgba(22,22,26,0.62)",
  backdropFilter: "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  boxShadow:
    "0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.35)",
  WebkitTapHighlightColor: "transparent",
  overflow: "visible",
  willChange: "transform",
  transition: "border-color 220ms cubic-bezier(0.32,0.72,0,1)",
};

export const SwipeActions = ({
  onSwipe,
  onRewind,
  onFirstImpression,
  canRewind = true,
  isPremium = false,
  superLikeBalance,
  firstImpressionBalance,
  boostActive = false,
  dailyLimits,
  dragX,
  dragY,
}: SwipeActionsProps) => {
  const passRef = useRef<HTMLButtonElement>(null);
  const likeRef = useRef<HTMLButtonElement>(null);
  const supRef = useRef<HTMLButtonElement>(null);

  // Color-fill overlay layers (separate from button to avoid re-rasterising blur).
  const passFillRef = useRef<HTMLSpanElement>(null);
  const likeFillRef = useRef<HTMLSpanElement>(null);
  const supFillRef = useRef<HTMLSpanElement>(null);

  // Soft outer glow rings.
  const passGlowRef = useRef<HTMLSpanElement>(null);
  const likeGlowRef = useRef<HTMLSpanElement>(null);
  const supGlowRef = useRef<HTMLSpanElement>(null);

  // Active-tone icon overlays (crossfade above the resting icon).
  const passIconRef = useRef<SVGSVGElement>(null);
  const likeIconRef = useRef<SVGSVGElement>(null);
  const supIconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!dragX && !dragY) return;
    let raf: number | null = null;
    // Smoothed values for buttery feel.
    let sLike = 0,
      sNope = 0,
      sSup = 0;

    const paintOne = (
      btn: HTMLButtonElement | null,
      fill: HTMLSpanElement | null,
      glow: HTMLSpanElement | null,
      icon: SVGSVGElement | null,
      progress: number,
      recede: number,
      tone: Tone,
    ) => {
      if (!btn) return;
      const e = ease(progress);
      const rec = ease(recede);

      // Active button rises & swells; siblings settle back without dimming hard.
      const scale = 1 + e * 0.22 - rec * 0.06;
      const lift = -e * 5;
      btn.style.transform = `translate3d(0,${lift.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;

      // Refined border lights up gently.
      btn.style.borderColor =
        e > 0.02
          ? `rgba(${tone.fill},${(0.25 + e * 0.55).toFixed(3)})`
          : "rgba(255,255,255,0.10)";

      // Inner color wash (separate layer — no blur recompute).
      if (fill) {
        fill.style.opacity = (e * 0.9).toFixed(3);
      }

      // Outer glow ring — slow expand, soft fade.
      if (glow) {
        const gScale = 1 + e * 0.55;
        glow.style.transform = `scale(${gScale.toFixed(3)})`;
        glow.style.opacity = (e * 0.45).toFixed(3);
      }

      // Icon crossfade toward active tone.
      if (icon) {
        icon.style.opacity = e.toFixed(3);
      }
    };

    const tick = () => {
      raf = null;
      const w = typeof window !== "undefined" ? window.innerWidth : 390;
      const dx = dragX?.get() ?? 0;
      const dy = dragY?.get() ?? 0;
      const tX = w * 0.30;
      const tY = 220;
      const tLike = Math.max(0, Math.min(1, dx / tX));
      const tNope = Math.max(0, Math.min(1, -dx / tX));
      const tSup = Math.max(0, Math.min(1, -dy / tY));

      // First-order smoothing (Apple's spring-like critically-damped feel).
      const k = 0.22;
      sLike += (tLike - sLike) * k;
      sNope += (tNope - sNope) * k;
      sSup += (tSup - sSup) * k;

      paintOne(
        passRef.current,
        passFillRef.current,
        passGlowRef.current,
        passIconRef.current,
        sNope,
        Math.max(sLike, sSup),
        TONES.pass,
      );
      paintOne(
        likeRef.current,
        likeFillRef.current,
        likeGlowRef.current,
        likeIconRef.current,
        sLike,
        Math.max(sNope, sSup),
        TONES.like,
      );
      paintOne(
        supRef.current,
        supFillRef.current,
        supGlowRef.current,
        supIconRef.current,
        sSup,
        Math.max(sLike, sNope),
        TONES.sup,
      );

      const settling =
        Math.abs(tLike - sLike) > 0.0005 ||
        Math.abs(tNope - sNope) > 0.0005 ||
        Math.abs(tSup - sSup) > 0.0005;
      if (settling) raf = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (raf != null) return;
      raf = requestAnimationFrame(tick);
    };
    const unsubs: Array<() => void> = [];
    if (dragX) unsubs.push(dragX.on("change", schedule));
    if (dragY) unsubs.push(dragY.on("change", schedule));
    tick();
    return () => {
      unsubs.forEach((u) => u());
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [dragX, dragY]);

  // Debounce lock: after any action fires we ignore further taps for the
  // duration of the fly-off animation (~450ms). Prevents double-swipes that
  // would advance the stack twice and double-charge super-like / FI credits.
  const busyRef = useRef(false);
  const press =
    (cb?: () => void, cooldownMs = 500) =>
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      window.setTimeout(() => { busyRef.current = false; }, cooldownMs);
      hapticTap();
      const el = e.currentTarget;
      el.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)" },
          { transform: "translate3d(0,1px,0) scale(0.9)" },
          { transform: "translate3d(0,-2px,0) scale(1.08)" },
          { transform: "translate3d(0,0,0) scale(1)" },
        ],
        { duration: 380, easing: "cubic-bezier(0.32,0.72,0,1)" },
      );
      el.blur();
      cb?.();
    };

  // Small pill badge overlay used on Super Like and First Impression to
  // surface remaining balance. Positioned top-right, inherits accent color.
  const Badge = ({ n, color }: { n: number; color: string }) => (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 9,
        background: color,
        color: "#0B0B0F",
        fontSize: 10,
        fontWeight: 700,
        lineHeight: "18px",
        textAlign: "center",
        letterSpacing: "-0.02em",
        border: "1.5px solid rgba(15,15,20,0.92)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
        pointerEvents: "none",
      }}
    >
      {n > 99 ? "99+" : n}
    </span>
  );



  const Fill = (
    ref: React.RefObject<HTMLSpanElement | null>,
    rgb: string,
  ) => (
    <span
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        opacity: 0,
        pointerEvents: "none",
        background: `radial-gradient(120% 120% at 50% 28%, rgba(${rgb},0.95) 0%, rgba(${rgb},0.55) 55%, rgba(${rgb},0) 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -10px 22px rgba(0,0,0,0.25)`,
      }}
    />
  );

  const Glow = (
    ref: React.RefObject<HTMLSpanElement | null>,
    rgb: string,
  ) => (
    <span
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: -16,
        borderRadius: "50%",
        opacity: 0,
        pointerEvents: "none",
        background: `radial-gradient(circle, rgba(${rgb},0.6) 0%, rgba(${rgb},0) 70%)`,
        filter: "blur(4px)",
      }}
    />
  );

  const ActiveIcon = ({
    refEl,
    children,
  }: {
    refEl: React.RefObject<SVGSVGElement | null>;
    children: React.ReactNode;
  }) => (
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* clone receives the ref via React.cloneElement-like wrapper */}
      <span
        ref={(node) => {
          if (!node) return;
          const svg = node.querySelector("svg") as SVGSVGElement | null;
          if (svg && refEl) {
            (refEl as { current: SVGSVGElement | null }).current = svg;
            svg.style.opacity = "0";
            svg.style.transition = "none";
          }
        }}
        style={{ display: "flex" }}
      >
        {children}
      </span>
    </span>
  );

  return (
    <div
      className="swipe-actions-row"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "16px 22px 32px",
        background:
          "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0) 100%)",
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={press(onRewind)}
        aria-label={isPremium ? "Rewind" : "Rewind (Premium)"}
        style={{
          ...BTN_BASE,
          width: 48,
          height: 48,
          opacity: !isPremium ? 1 : canRewind ? 1 : 0.45,
        }}
      >
        <RotateCcw size={20} color="#F4A23B" strokeWidth={2.6} />
        {!isPremium && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: -3,
              right: -3,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "linear-gradient(135deg,#FFD37A,#F4A23B)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid rgba(15,15,20,0.92)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
            }}
          >
            <Lock size={10} color="#0B0B0F" strokeWidth={3} />
          </span>
        )}
      </button>

      <button
        ref={passRef}
        onClick={press(() => onSwipe("left"))}
        aria-label="Pass"
        style={{ ...BTN_BASE, width: 62, height: 62 }}
      >
        {Glow(passGlowRef, TONES.pass.fill)}
        {Fill(passFillRef, TONES.pass.fill)}
        <X size={28} color="#FFFFFF" strokeWidth={2.8} style={{ position: "relative" }} />
        <ActiveIcon refEl={passIconRef}>
          <X size={28} color="#FFFFFF" strokeWidth={3} />
        </ActiveIcon>
      </button>

      <button
        ref={supRef}
        onClick={press(() => onSwipe("up"))}
        aria-label={`Super like${typeof superLikeBalance === "number" ? ` (${superLikeBalance} restantes)` : ""}`}
        style={{ ...BTN_BASE, width: 56, height: 56 }}
      >
        {Glow(supGlowRef, TONES.sup.fill)}
        {Fill(supFillRef, TONES.sup.fill)}
        <Star size={24} color="#A8B5E8" strokeWidth={2.2} fill="transparent" style={{ position: "relative" }} />
        <ActiveIcon refEl={supIconRef}>
          <Star size={24} color="#FFFFFF" strokeWidth={2.2} fill="#FFFFFF" />
        </ActiveIcon>
        {typeof superLikeBalance === "number" && superLikeBalance > 0 && (
          <Badge n={superLikeBalance} color="#4FB8FF" />
        )}
      </button>

      <button
        ref={likeRef}
        onClick={press(() => onSwipe("right"))}
        aria-label={
          dailyLimits && !boostActive
            ? `Like (${Math.max(0, dailyLimits.likesLimit - dailyLimits.likesUsed)} restantes hoje)`
            : "Like"
        }
        style={{
          ...BTN_BASE,
          width: 62,
          height: 62,
          animation: boostActive ? "hunieBoostPulse 1.6s ease-in-out infinite" : undefined,
        }}
      >
        {Glow(likeGlowRef, TONES.like.fill)}
        {Fill(likeFillRef, TONES.like.fill)}
        <Heart size={26} color="#FF3B4E" strokeWidth={2.4} fill="#FF3B4E" style={{ position: "relative" }} />
        <ActiveIcon refEl={likeIconRef}>
          <Heart size={26} color="#FFFFFF" strokeWidth={2.4} fill="#FFFFFF" />
        </ActiveIcon>
      </button>

      <button
        onClick={press(onFirstImpression)}
        aria-label={`First Impression${typeof firstImpressionBalance === "number" ? ` (${firstImpressionBalance} restantes)` : ""}`}
        style={{ ...BTN_BASE, width: 48, height: 48 }}
      >
        <MessageSquarePlus size={20} color="#FF6FA8" strokeWidth={2.4} />
        {typeof firstImpressionBalance === "number" && firstImpressionBalance > 0 && (
          <Badge n={firstImpressionBalance} color="#FF6FA8" />
        )}
      </button>

      <style>{`@keyframes hunieBoostPulse {
        0%, 100% { box-shadow: 0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.35), 0 0 0 0 rgba(255,79,163,0.55); }
        50% { box-shadow: 0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.35), 0 0 0 10px rgba(255,79,163,0); }
      }`}</style>
    </div>
  );
};

