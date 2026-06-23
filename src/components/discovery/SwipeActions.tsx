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
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.07)",
  cursor: "pointer",
  background: "rgba(14,14,18,0.78)",
  backdropFilter: "blur(22px) saturate(180%)",
  WebkitBackdropFilter: "blur(22px) saturate(180%)",
  boxShadow:
    "0 10px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
  WebkitTapHighlightColor: "transparent",
  overflow: "visible",
};

type Tone = {
  rgb: string; // "255,59,78"
  icon: string; // resting icon color
};

const TONE = {
  pass: { rgb: "255,255,255", icon: "#FFFFFF" } satisfies Tone,
  passActive: "255,59,78",
  like: { rgb: "255,59,78", icon: "#FF3B4E" } satisfies Tone,
  likeActive: "25,210,126",
  sup: { rgb: "168,181,232", icon: "#A8B5E8" } satisfies Tone,
  supActive: "31,184,255",
};

// Smoothstep — premium ease for visual rigging
const ease = (p: number) => p * p * (3 - 2 * p);

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
  const passIconRef = useRef<SVGSVGElement>(null);
  const likeIconRef = useRef<SVGSVGElement>(null);
  const superIconRef = useRef<SVGSVGElement>(null);
  const passHaloRef = useRef<HTMLSpanElement>(null);
  const likeHaloRef = useRef<HTMLSpanElement>(null);
  const superHaloRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!dragX && !dragY) return;
    let raf: number | null = null;
    let lastNope = 0,
      lastLike = 0,
      lastSup = 0;

    const paint = (
      btn: HTMLButtonElement | null,
      halo: HTMLSpanElement | null,
      icon: SVGSVGElement | null,
      p: number,
      activeP: number, // recede when a sibling is active
      restRgb: string,
      activeRgb: string,
      restIcon: string,
    ) => {
      if (!btn) return;
      // Active button: lift + scale; sibling buttons: recede + dim.
      const sibling = activeP > p ? activeP : 0;
      const scale = 1 + ease(p) * 0.28 - sibling * 0.08;
      const lift = -ease(p) * 6;
      btn.style.transform = `translate3d(0,${lift.toFixed(2)}px,0) scale(${scale.toFixed(3)})`;
      btn.style.opacity = String(1 - sibling * 0.35);

      // Fill background fades toward the active color.
      const fillA = ease(p) * 0.85;
      btn.style.background = `radial-gradient(120% 120% at 50% 30%, rgba(${activeRgb},${(fillA * 0.55).toFixed(3)}) 0%, rgba(14,14,18,${(0.78 - ease(p) * 0.15).toFixed(3)}) 60%)`;
      btn.style.borderColor =
        p > 0.02
          ? `rgba(${activeRgb},${(0.35 + ease(p) * 0.5).toFixed(3)})`
          : "rgba(255,255,255,0.07)";
      btn.style.boxShadow =
        p > 0.02
          ? `0 14px 38px rgba(${activeRgb},${(ease(p) * 0.55).toFixed(3)}), 0 0 0 ${(ease(p) * 2.2).toFixed(2)}px rgba(${activeRgb},${(ease(p) * 0.55).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.1)`
          : "0 10px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)";

      // Outer halo pulse ring.
      if (halo) {
        const haloScale = 1 + ease(p) * 0.9;
        const haloAlpha = ease(p) * 0.35;
        halo.style.transform = `scale(${haloScale.toFixed(3)})`;
        halo.style.opacity = String(haloAlpha);
        halo.style.background = `radial-gradient(circle, rgba(${activeRgb},0.55) 0%, rgba(${activeRgb},0) 70%)`;
      }

      // Icon morphs from rest tone toward active tone, fills heart/star.
      if (icon) {
        const mix = ease(p);
        const [r1, g1, b1] = restRgb.split(",").map(Number);
        const [r2, g2, b2] = activeRgb.split(",").map(Number);
        const r = Math.round(r1 + (r2 - r1) * mix);
        const g = Math.round(g1 + (g2 - g1) * mix);
        const b = Math.round(b1 + (b2 - b1) * mix);
        const color = mix > 0.05 ? `rgb(${r},${g},${b})` : restIcon;
        icon.style.color = color;
        icon.setAttribute("stroke", color);
        // Heart/star fill follows tone for full opacity at threshold.
        const fill = mix > 0.05 ? `rgba(${r},${g},${b},${(0.2 + mix * 0.8).toFixed(3)})` : "transparent";
        const filled = icon.getAttribute("data-fillable");
        if (filled === "true") icon.setAttribute("fill", fill);
      }
    };

    const tick = () => {
      raf = null;
      const w = typeof window !== "undefined" ? window.innerWidth : 390;
      const dx = dragX?.get() ?? 0;
      const dy = dragY?.get() ?? 0;
      const t = w * 0.28;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 200));

      // Critically-damped follow for buttery feel
      const k = 0.32;
      lastLike += (like - lastLike) * k;
      lastNope += (nope - lastNope) * k;
      lastSup += (sup - lastSup) * k;

      const maxOther = Math.max(lastLike, lastNope, lastSup);
      paint(
        passRef.current,
        passHaloRef.current,
        passIconRef.current,
        lastNope,
        Math.max(lastLike, lastSup),
        TONE.pass.rgb,
        TONE.passActive,
        TONE.pass.icon,
      );
      paint(
        likeRef.current,
        likeHaloRef.current,
        likeIconRef.current,
        lastLike,
        Math.max(lastNope, lastSup),
        TONE.like.rgb,
        TONE.likeActive,
        TONE.like.icon,
      );
      paint(
        superRef.current,
        superHaloRef.current,
        superIconRef.current,
        lastSup,
        Math.max(lastLike, lastNope),
        TONE.sup.rgb,
        TONE.supActive,
        TONE.sup.icon,
      );

      // Keep animating while values are still settling.
      const stillAnimating =
        Math.abs(like - lastLike) > 0.001 ||
        Math.abs(nope - lastNope) > 0.001 ||
        Math.abs(sup - lastSup) > 0.001 ||
        maxOther > 0.001;
      if (stillAnimating) raf = requestAnimationFrame(tick);
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

  const press =
    (cb?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      el.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.86)" },
          { transform: "scale(1.06)" },
          { transform: "scale(1)" },
        ],
        { duration: 320, easing: "cubic-bezier(0.22,1,0.36,1)" },
      );
      cb?.();
    };

  const Halo = (ref: React.RefObject<HTMLSpanElement>) => (
    <span
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: -14,
        borderRadius: "50%",
        opacity: 0,
        pointerEvents: "none",
        transformOrigin: "center",
        filter: "blur(2px)",
      }}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "16px 22px 20px",
        background:
          "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0) 100%)",
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
        style={{ ...baseBtn, width: 62, height: 62, willChange: "transform, background, box-shadow" }}
      >
        {Halo(passHaloRef)}
        <X ref={passIconRef as never} size={30} color="#FFFFFF" strokeWidth={3} />
      </button>

      <button
        ref={superRef}
        onClick={press(() => onSwipe("up"))}
        aria-label="Super like"
        style={{ ...baseBtn, width: 56, height: 56, willChange: "transform, background, box-shadow" }}
      >
        {Halo(superHaloRef)}
        <Star
          ref={superIconRef as never}
          size={24}
          color="#A8B5E8"
          strokeWidth={2.4}
          fill="transparent"
          data-fillable="true"
        />
      </button>

      <button
        ref={likeRef}
        onClick={press(() => onSwipe("right"))}
        aria-label="Like"
        style={{ ...baseBtn, width: 62, height: 62, willChange: "transform, background, box-shadow" }}
      >
        {Halo(likeHaloRef)}
        <Heart
          ref={likeIconRef as never}
          size={28}
          color="#FF3B4E"
          strokeWidth={2.4}
          fill="#FF3B4E"
          data-fillable="true"
        />
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
