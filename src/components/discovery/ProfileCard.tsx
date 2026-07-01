import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  animate,
  type MotionValue,
} from "framer-motion";
import { MapPin, ArrowUp, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { DiscoveryProfile, SwipeDirection } from "./types";
import { setDiscoveryDetailOpen } from "@/lib/discoveryDetail";

interface ProfileCardProps {
  profile: DiscoveryProfile;
  onSwipe: (direction: SwipeDirection) => void;
  isTop?: boolean;
  nextProfiles?: DiscoveryProfile[];
  sharedX?: MotionValue<number>;
  sharedY?: MotionValue<number>;
  actions?: ReactNode;
  panelActions?: ReactNode;
  enterAnim?: "rewind-left" | "rewind-right" | "rewind-up" | null;
}

export interface ProfileCardHandle {
  flyLeft: () => void;
  flyRight: () => void;
  flyUp: () => void;
}

const getVW = () => (typeof window !== "undefined" ? window.innerWidth : 390);
const getVH = () => (typeof window !== "undefined" ? window.innerHeight : 800);

function formatDistance(meters?: number) {
  if (!meters || meters <= 0) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

const StackCard = ({
  profile,
  topX,
  topY,
  stackIndex,
}: {
  profile: DiscoveryProfile;
  topX: MotionValue<number>;
  topY: MotionValue<number>;
  stackIndex: 1 | 2;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const apply = useCallback(() => {
    rafRef.current = null;
    const el = ref.current;
    if (!el) return;
    const dx = topX.get();
    const dy = topY.get();
    const w = getVW();
    const threshold = w * 0.35;
    const progress = Math.min(1, Math.sqrt(dx * dx + dy * dy) / threshold);
    if (stackIndex === 1) {
      const scale = 0.94 + progress * 0.06;
      const ty = 10 - progress * 10;
      const tx = -dx * 0.025;
      el.style.transform = `translate3d(${tx.toFixed(2)}px,${ty}px,0) scale(${scale})`;
    } else {
      const tx2 = -dx * 0.012;
      const scale2 = 0.88 + progress * 0.03;
      const ty2 = 20 - progress * 6;
      el.style.transform = `translate3d(${tx2.toFixed(2)}px,${ty2}px,0) scale(${scale2.toFixed(3)})`;
    }
  }, [stackIndex, topX, topY]);

  const schedule = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(apply);
  }, [apply]);

  useEffect(() => {
    apply();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [apply]);
  useMotionValueEvent(topX, "change", schedule);
  useMotionValueEvent(topY, "change", schedule);


  const photo = profile.photos[0];
  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{
        zIndex: stackIndex === 1 ? 9 : 8,
        pointerEvents: "none",
        background: "#000",
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        willChange: "transform",
        transform:
          stackIndex === 1
            ? "translate3d(0,10px,0) scale(0.94)"
            : "translate3d(0,20px,0) scale(0.88)",
        opacity: stackIndex === 1 ? 1 : 0.001,
      }}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority={stackIndex === 1 ? "high" : "low"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "55%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0) 100%)",
        }}
      />
    </div>
  );
};

export const ProfileCard = forwardRef<ProfileCardHandle, ProfileCardProps>(
  (
    {
      profile,
      onSwipe,
      isTop = true,
      nextProfiles = [],
      sharedX,
      sharedY,
      actions,
      panelActions,
      enterAnim = null,
    },
    ref,
  ) => {
    const [photoIdx, setPhotoIdx] = useState(0);
    const [detailOpen, setDetailOpen] = useState(false);
    useEffect(() => {
      setDiscoveryDetailOpen(detailOpen);
      return () => setDiscoveryDetailOpen(false);
    }, [detailOpen]);
    const photos = profile.photos.length ? profile.photos : [""];

    const localX = useMotionValue(0);
    const localY = useMotionValue(0);
    const x = sharedX ?? localX;
    const y = sharedY ?? localY;
    // Start in the stacked pose on first paint so the spring-in is smooth
    // (avoids a 1-frame jump from settled -> stacked before the animation starts).
    const entry = useMotionValue(0); // 0 = settled, 1 = stacked pose
    const cardRef = useRef<HTMLDivElement>(null);
    const photoWrapRef = useRef<HTMLDivElement>(null);
    const infoWrapRef = useRef<HTMLDivElement>(null);
    const likeLabelRef = useRef<HTMLDivElement>(null);
    const nopeLabelRef = useRef<HTMLDivElement>(null);
    const supLabelRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);
    const startRef = useRef({ x: 0, y: 0 });

    const tickRef = useRef<number | null>(null);
    const tick = useCallback(() => {
      tickRef.current = null;
      const el = cardRef.current;
      if (!el) return;
      const dx = x.get();
      const dy = y.get();
      const w = getVW();
      const h = getVH();
      // Card transform
      const rot = (dx / w) * 30;
      const rotY = (dx / w) * 7;
      const rotX = -(dy / h) * 5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const progress = Math.min(1, dist / (w * 0.4));
      const dragScale = 1 + progress * 0.025;
      const e = entry.get();
      const entryY = e * 10;
      const entryScale = 1 - e * 0.06;
      const scale = dragScale * entryScale;
      el.style.transform = `translate3d(${dx}px,${dy + entryY}px,0) rotate(${rot.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      // Parallax layers
      if (photoWrapRef.current) {
        photoWrapRef.current.style.transform = `translate3d(${dx * -0.06}px, ${dy * -0.04}px, 0) scale(1.04)`;
      }
      if (infoWrapRef.current) {
        infoWrapRef.current.style.transform = `translate3d(${dx * 0.04}px, ${dy * 0.02}px, 0)`;
      }
      // Labels — opacity + transform combined
      const t = w * 0.25;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 180));
      if (likeLabelRef.current) {
        likeLabelRef.current.style.opacity = String(like);
        likeLabelRef.current.style.transform = `translate3d(${dx * 0.12}px, ${dy * 0.08}px, 0) rotate(-18deg)`;
      }
      if (nopeLabelRef.current) {
        nopeLabelRef.current.style.opacity = String(nope);
        nopeLabelRef.current.style.transform = `translate3d(${dx * -0.12}px, ${dy * 0.08}px, 0) rotate(18deg)`;
      }
      if (supLabelRef.current) {
        supLabelRef.current.style.opacity = String(sup);
        supLabelRef.current.style.transform = `translate3d(${dx * 0.08}px, ${dy * 0.12}px, 0) translateX(-50%) rotate(-6deg)`;
      }
    }, [x, y, entry]);

    const schedule = useCallback(() => {
      if (tickRef.current != null) return;
      tickRef.current = requestAnimationFrame(tick);
    }, [tick]);

    useEffect(() => {
      tick();
      return () => {
        if (tickRef.current != null) cancelAnimationFrame(tickRef.current);
      };
    }, [tick]);
    useMotionValueEvent(x, "change", schedule);
    useMotionValueEvent(y, "change", schedule);
    useMotionValueEvent(entry, "change", schedule);

    const snapSpring = { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.7, restDelta: 0.5 };
    // Fluid exit: carries finger velocity and advances before the invisible spring settle.
    const flySpring = { type: "spring" as const, stiffness: 120, damping: 18, mass: 0.72, restDelta: 8, restSpeed: 90 };

    const animXRef = useRef<ReturnType<typeof animate> | null>(null);
    const animYRef = useRef<ReturnType<typeof animate> | null>(null);
    const flyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelAnim = () => {
      if (flyCommitTimerRef.current) {
        clearTimeout(flyCommitTimerRef.current);
        flyCommitTimerRef.current = null;
      }
      animXRef.current?.stop();
      animYRef.current?.stop();
      animXRef.current = null;
      animYRef.current = null;
    };

    useEffect(
      () => () => {
        if (flyCommitTimerRef.current) clearTimeout(flyCommitTimerRef.current);
        animXRef.current?.stop();
        animYRef.current?.stop();
      },
      [],
    );


    const animateTo = useCallback(
      (tx: number, ty: number, isFly = false, onDone?: () => void, velocity?: { x: number; y: number }) => {
        cancelAnim();
        const spring = isFly ? flySpring : snapSpring;
        // Attach onComplete to whichever axis travels farther so a vertical
        // fly-out (super like) doesn't fire onDone instantly via an X spring
        // that has no movement.
        const dx = Math.abs(tx - x.get());
        const dy = Math.abs(ty - y.get());
        const onX = dx >= dy ? onDone : undefined;
        const onY = dx >= dy ? undefined : onDone;
        animXRef.current = animate(x, tx, { ...spring, velocity: velocity?.x, onComplete: onX });
        animYRef.current = animate(y, ty, { ...spring, velocity: velocity?.y, onComplete: onY });
      },
      [x, y],
    );

    useEffect(() => {
      if (!enterAnim) return;
      const w = getVW();
      const h = getVH();
      if (enterAnim === "rewind-left") {
        x.set(-w * 1.2);
        y.set(0);
      } else if (enterAnim === "rewind-right") {
        x.set(w * 1.2);
        y.set(0);
      } else if (enterAnim === "rewind-up") {
        x.set(0);
        y.set(-h * 1.2);
      }
      requestAnimationFrame(() => animateTo(0, 0));
    }, [enterAnim, animateTo, x, y]);

    const flyOut = (dir: SwipeDirection, velocity?: { x: number; y: number }) => {
      const w = getVW();
      const h = getVH();
      const tx = dir === "left" ? -w * 1.9 : dir === "right" ? w * 1.9 : 0;
      const ty = dir === "up" ? -h * 1.4 : 0;
      animateTo(tx, ty, true, undefined, velocity);
      flyCommitTimerRef.current = setTimeout(() => {
        flyCommitTimerRef.current = null;
        // Stop the in-flight spring so the next card (which shares x/y)
        // doesn't inherit the off-screen values and render frozen.
        animXRef.current?.stop();
        animYRef.current?.stop();
        animXRef.current = null;
        animYRef.current = null;
        onSwipe(dir);
      }, 300);
    };


    useImperativeHandle(ref, () => ({
      flyLeft: () => flyOut("left"),
      flyRight: () => flyOut("right"),
      flyUp: () => flyOut("up"),
    }));

    // Velocity tracking for fling detection
    const sampleRef = useRef<{ x: number; y: number; t: number }>({ x: 0, y: 0, t: 0 });
    const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
    const downRef = useRef<{ x: number; y: number; t: number; rectX: number; rectW: number } | null>(null);
    const movedRef = useRef(false);

    const onPointerDown = (e: React.PointerEvent) => {
      if (!isTop || detailOpen) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      cancelAnim();
      draggingRef.current = true;
      movedRef.current = false;
      startRef.current = { x: e.clientX - x.get(), y: e.clientY - y.get() };
      sampleRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      velocityRef.current = { vx: 0, vy: 0 };
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      downRef.current = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        rectX: rect.left,
        rectW: rect.width,
      };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const nx = e.clientX - startRef.current.x;
      const rawY = e.clientY - startRef.current.y;
      // Allow up freely (scaled), rubber-band downward
      const ny = rawY <= 0 ? rawY * 0.7 : Math.pow(rawY, 0.7) * 0.5;
      if (Math.abs(nx) > 6 || Math.abs(rawY) > 6) movedRef.current = true;
      x.set(nx);
      y.set(ny);
      // Velocity sample (exponential smoothing)
      const now = performance.now();
      const dt = Math.max(1, now - sampleRef.current.t);
      const vx = ((e.clientX - sampleRef.current.x) / dt) * 1000;
      const vy = ((e.clientY - sampleRef.current.y) / dt) * 1000;
      velocityRef.current.vx = velocityRef.current.vx * 0.4 + vx * 0.6;
      velocityRef.current.vy = velocityRef.current.vy * 0.4 + vy * 0.6;
      sampleRef.current = { x: e.clientX, y: e.clientY, t: now };
    };
    const onPointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const dx = x.get();
      const dy = y.get();
      const { vx, vy } = velocityRef.current;
      const w = getVW();
      const swipeX = w * 0.32;
      const flingX = 950;
      const flingY = -950;
      const goUp = (dy < -180 && vy < -350 && Math.abs(vx) < Math.abs(vy)) || vy < flingY;
      const goRight = dx > swipeX || vx > flingX;
      const goLeft = dx < -swipeX || vx < -flingX;
      // Tap detection — navigate photos
      const down = downRef.current;
      const tappedQuickly =
        !movedRef.current &&
        down &&
        performance.now() - down.t < 350 &&
        !goUp && !goRight && !goLeft;
      if (tappedQuickly && down) {
        const relX = down.x - down.rectX;
        const isLeft = relX < down.rectW / 2;
        if (isLeft) goPrevPhoto();
        else goNextPhoto();
        animateTo(0, 0, false);
        return;
      }
      if (goUp) flyOut("up", { x: vx, y: vy });
      else if (goRight && vx >= -flingX) flyOut("right", { x: vx, y: vy });
      else if (goLeft && vx <= flingX) flyOut("left", { x: vx, y: vy });
      else animateTo(0, 0, false, undefined, { x: vx, y: vy });
    };




    const goPrevPhoto = useCallback(
      () => setPhotoIdx((i) => Math.max(0, i - 1)),
      [],
    );
    const goNextPhoto = useCallback(
      () => setPhotoIdx((i) => Math.min(photos.length - 1, i + 1)),
      [photos.length],
    );




    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: "#000", perspective: 1200 }}>
        {isTop && nextProfiles[1] && (
          <StackCard profile={nextProfiles[1]} topX={x} topY={y} stackIndex={2} />
        )}
        {isTop && nextProfiles[0] && (
          <StackCard profile={nextProfiles[0]} topX={x} topY={y} stackIndex={1} />
        )}

        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            touchAction: "none",
            willChange: "transform",
            userSelect: "none",
            transformStyle: "preserve-3d",
          }}
        >

          <div
            ref={photoWrapRef}
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              background: "#111",
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              willChange: "transform",
            }}
          >
            {photos.map((src, i) => (
              <img
                key={i + src}
                src={src}
                alt={profile.name}
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: i === photoIdx ? 1 : 0,
                  transition: "opacity 120ms linear",
                }}
              />
            ))}

            {photos.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 8,
                  right: 8,
                  display: "flex",
                  gap: 4,
                  zIndex: 4,
                }}
              >
                {photos.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      background:
                        i === photoIdx ? "#fff" : "rgba(255,255,255,0.35)",
                      transition: "background 120ms",
                    }}
                  />
                ))}
              </div>
            )}

            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "55%",
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 38%, rgba(0,0,0,0) 100%)",
                pointerEvents: "none",
              }}
            />

            <div
              ref={likeLabelRef}
              style={{
                position: "absolute",
                top: 80,
                left: 24,
                transform: "rotate(-18deg)",
                border: "4px solid #19D27E",
                color: "#19D27E",
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 36,
                letterSpacing: 2,
                opacity: 0,
                willChange: "opacity, transform",
                zIndex: 5,
              }}
            >
              LIKE
            </div>
            <div
              ref={nopeLabelRef}
              style={{
                position: "absolute",
                top: 80,
                right: 24,
                transform: "rotate(18deg)",
                border: "4px solid #FF4458",
                color: "#FF4458",
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 36,
                letterSpacing: 2,
                opacity: 0,
                willChange: "opacity, transform",
                zIndex: 5,
              }}
            >
              NOPE
            </div>
            <div
              ref={supLabelRef}
              style={{
                position: "absolute",
                top: 120,
                left: "50%",
                transform: "translateX(-50%) rotate(-6deg)",
                border: "4px solid #1FB8FF",
                color: "#1FB8FF",
                padding: "6px 14px",
                borderRadius: 8,
                fontWeight: 900,
                fontSize: 32,
                letterSpacing: 2,
                opacity: 0,
                willChange: "opacity, transform",
                zIndex: 5,
              }}
            >
              SUPER
            </div>
          </div>

          <div
            ref={infoWrapRef}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 96,
              padding: "0 18px",
              color: "#fff",
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            {/* Nearby pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 12px",
                borderRadius: 999,
                background: "#fff",
                color: "#0a0a0a",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Nearby
            </div>

            {/* Name + age */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {profile.name.split(' ')[0]}
              </h2>
              <span style={{ fontSize: 30, fontWeight: 400, opacity: 0.95 }}>
                {profile.age}
              </span>
              {profile.isOnline && (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#19D27E",
                    boxShadow: "0 0 0 2px rgba(25,210,126,0.25)",
                    marginLeft: 2,
                    alignSelf: "center",
                  }}
                />
              )}
            </div>

            {/* Interests label */}
            {profile.interests && profile.interests.length > 0 && (
              <>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-grid",
                      gridTemplateColumns: "5px 5px",
                      gridTemplateRows: "5px 5px",
                      gap: 2,
                    }}
                  >
                    <span style={{ background: "#fff", borderRadius: 1 }} />
                    <span style={{ background: "#fff", borderRadius: 1 }} />
                    <span style={{ background: "#fff", borderRadius: 1 }} />
                    <span style={{ background: "#fff", borderRadius: 1 }} />
                  </span>
                  Interests
                </div>

                {/* Interest chips */}
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {profile.interests.slice(0, 10).map((it, i) => {
                    const highlighted = i === 0;
                    return (
                      <span
                        key={it}
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          padding: "8px 14px",
                          borderRadius: 999,
                          background: highlighted
                            ? "#F8B6D2"
                            : "rgba(10,10,12,0.78)",
                          color: highlighted ? "#1a0712" : "#fff",
                          border: highlighted
                            ? "1px solid rgba(255,255,255,0.15)"
                            : "1px solid rgba(255,255,255,0.08)",
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          lineHeight: 1.1,
                        }}
                      >
                        {it}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setDetailOpen(true);
            }}
            style={{
              position: "absolute",
              right: 16,
              bottom: 110,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(40,40,46,0.72)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: "#fff",
              zIndex: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Ver detalhes"
          >
            <ArrowUp size={20} strokeWidth={2.6} />
          </button>
        </div>

        {actions && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 20,
              pointerEvents: "auto",
            }}
          >
            {actions}
          </div>
        )}

        {detailOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) {
                setDetailOpen(false);
              }
            }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: "#0a0a0a",
              color: "#fff",
              overflowY: "auto",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
              borderRadius: 0,
              touchAction: "pan-y",
            }}
          >
            {/* Photo carousel */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = e.clientX - rect.left;
                if (relX < rect.width / 2) goPrevPhoto();
                else goNextPhoto();
              }}
              style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", background: "#111", marginTop: "env(safe-area-inset-top, 0px)", cursor: "pointer" }}
            >
              {photos.map((src, i) => (
                <img
                  key={i + src}
                  src={src}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: i === photoIdx ? 1 : 0,
                    transition: "opacity 150ms linear",
                  }}
                />
              ))}
              {photos.length > 1 && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 10,
                      right: 10,
                      display: "flex",
                      gap: 4,
                      zIndex: 2,
                    }}
                  >
                    {photos.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: i === photoIdx ? "#fff" : "rgba(255,255,255,0.35)",
                          transition: "background 120ms",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={goPrevPhoto}
                    aria-label="Foto anterior"
                    disabled={photoIdx === 0}
                    style={{
                      position: "absolute",
                      left: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.45)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: photoIdx === 0 ? 0.3 : 1,
                      cursor: "pointer",
                    }}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={goNextPhoto}
                    aria-label="Próxima foto"
                    disabled={photoIdx === photos.length - 1}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.45)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: photoIdx === photos.length - 1 ? 0.3 : 1,
                      cursor: "pointer",
                    }}
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setDetailOpen(false)}
              style={{
                position: "fixed",
                top: "calc(env(safe-area-inset-top, 0px) + 12px)",
                right: 16,
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 40,
              }}
              aria-label="Fechar"
            >
              <X size={22} />
            </button>

            <div style={{ padding: "20px 20px 0" }}>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: 10 }}
              >
                <h2 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>
                  {profile.name}
                </h2>
                <span style={{ fontSize: 24, opacity: 0.9 }}>{profile.age}</span>
              </div>
              {(profile.city || profile.distance) && (
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: 0.8,
                    fontSize: 14,
                  }}
                >
                  <MapPin size={14} /> {profile.city}
                  {profile.city && profile.distance ? " • " : ""}
                  {formatDistance(profile.distance)}
                </div>
              )}
              {profile.bio && (
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 15,
                    lineHeight: 1.5,
                    opacity: 0.92,
                  }}
                >
                  {profile.bio}
                </p>
              )}
              {profile.interests && profile.interests.length > 0 && (
                <>
                  <h3
                    style={{
                      marginTop: 24,
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      opacity: 0.6,
                    }}
                  >
                    Interesses
                  </h3>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {profile.interests.map((it) => (
                      <span
                        key={it}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          padding: "8px 14px",
                          borderRadius: 999,
                          background: "#FF4458",
                          color: "#fff",
                        }}
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {panelActions && (
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background:
                    "linear-gradient(to top, #0a0a0a 70%, rgba(10,10,10,0))",
                }}
              >
                {panelActions}
              </div>
            )}
          </motion.div>
        )}

      </div>
    );
  },
);
ProfileCard.displayName = "ProfileCard";
