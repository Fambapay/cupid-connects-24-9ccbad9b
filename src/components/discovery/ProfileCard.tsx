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
import { MapPin, ChevronDown, ArrowUp } from "lucide-react";
import type { DiscoveryProfile, SwipeDirection } from "./types";

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
  const apply = useCallback(() => {
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

  useEffect(() => {
    apply();
  }, [apply]);
  useMotionValueEvent(topX, "change", apply);
  useMotionValueEvent(topY, "change", apply);

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
    const photos = profile.photos.length ? profile.photos : [""];

    const localX = useMotionValue(0);
    const localY = useMotionValue(0);
    const x = sharedX ?? localX;
    const y = sharedY ?? localY;
    const entry = useMotionValue(enterAnim ? 1 : 0); // 0 = settled, 1 = stacked pose
    const cardRef = useRef<HTMLDivElement>(null);
    const photoWrapRef = useRef<HTMLDivElement>(null);
    const infoWrapRef = useRef<HTMLDivElement>(null);
    const likeLabelRef = useRef<HTMLDivElement>(null);
    const nopeLabelRef = useRef<HTMLDivElement>(null);
    const supLabelRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);
    const startRef = useRef({ x: 0, y: 0 });

    const applyParallax = useCallback(() => {
      const dx = x.get();
      const dy = y.get();
      if (photoWrapRef.current) {
        photoWrapRef.current.style.transform = `translate3d(${dx * -0.06}px, ${dy * -0.04}px, 0) scale(1.04)`;
      }
      if (infoWrapRef.current) {
        infoWrapRef.current.style.transform = `translate3d(${dx * 0.04}px, ${dy * 0.02}px, 0)`;
      }
      if (likeLabelRef.current) {
        likeLabelRef.current.style.transform = `translate3d(${dx * 0.12}px, ${dy * 0.08}px, 0) rotate(-18deg)`;
      }
      if (nopeLabelRef.current) {
        nopeLabelRef.current.style.transform = `translate3d(${dx * -0.12}px, ${dy * 0.08}px, 0) rotate(18deg)`;
      }
      if (supLabelRef.current) {
        supLabelRef.current.style.transform = `translate3d(${dx * 0.08}px, ${dy * 0.12}px, 0) translateX(-50%) rotate(-6deg)`;
      }
    }, [x, y]);

    const apply = useCallback(() => {
      const el = cardRef.current;
      if (!el) return;
      const dx = x.get();
      const dy = y.get();
      const w = getVW();
      const h = getVH();
      const rot = (dx / w) * 30;
      const rotY = (dx / w) * 7;
      const rotX = -(dy / h) * 5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const progress = Math.min(1, dist / (w * 0.4));
      const dragScale = 1 + progress * 0.025;
      // Entry blend: at e=1 we mimic the stack-1 pose (y+10, scale 0.94)
      const e = entry.get();
      const entryY = e * 10;
      const entryScale = 1 - e * 0.06;
      const scale = dragScale * entryScale;
      el.style.transform = `translate3d(${dx}px,${dy + entryY}px,0) rotate(${rot.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      applyParallax();
    }, [x, y, entry, applyParallax]);
    useEffect(() => {
      apply();
    }, [apply]);
    useMotionValueEvent(x, "change", apply);
    useMotionValueEvent(y, "change", apply);
    useMotionValueEvent(entry, "change", apply);

    // Spring the card up from the stacked pose into place on mount
    useEffect(() => {
      if (enterAnim) return; // rewind handles its own entry
      entry.set(1);
      const controls = animate(entry, 0, {
        type: "spring",
        stiffness: 340,
        damping: 30,
        mass: 0.7,
        restDelta: 0.001,
      });
      return () => controls.stop();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const snapSpring = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.9 };
    const flySpring = { type: "spring" as const, stiffness: 280, damping: 24, mass: 0.8 };

    const animXRef = useRef<ReturnType<typeof animate> | null>(null);
    const animYRef = useRef<ReturnType<typeof animate> | null>(null);
    const cancelAnim = () => {
      animXRef.current?.stop();
      animYRef.current?.stop();
      animXRef.current = null;
      animYRef.current = null;
    };

    const animateTo = useCallback(
      (tx: number, ty: number, isFly = false, onDone?: () => void) => {
        cancelAnim();
        const spring = isFly ? flySpring : snapSpring;
        animXRef.current = animate(x, tx, { ...spring, onComplete: onDone });
        animYRef.current = animate(y, ty, spring);
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

    const flyOut = (dir: SwipeDirection) => {
      const w = getVW();
      const h = getVH();
      const tx = dir === "left" ? -w * 1.4 : dir === "right" ? w * 1.4 : 0;
      const ty = dir === "up" ? -h * 1.4 : 0;
      animateTo(tx, ty, true, () => onSwipe(dir));
    };

    useImperativeHandle(ref, () => ({
      flyLeft: () => flyOut("left"),
      flyRight: () => flyOut("right"),
      flyUp: () => flyOut("up"),
    }));

    const onPointerDown = (e: React.PointerEvent) => {
      if (!isTop || detailOpen) return;
      cancelAnim();
      draggingRef.current = true;
      startRef.current = { x: e.clientX - x.get(), y: e.clientY - y.get() };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      x.set(e.clientX - startRef.current.x);
      y.set(Math.min(0, e.clientY - startRef.current.y) * 0.6);
    };
    const onPointerUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const dx = x.get();
      const dy = y.get();
      const w = getVW();
      const swipeX = w * 0.28;
      if (dy < -160 && Math.abs(dx) < 100) flyOut("up");
      else if (dx > swipeX) flyOut("right");
      else if (dx < -swipeX) flyOut("left");
      else animateTo(0, 0);
    };

    const onClickPhoto = (e: React.MouseEvent) => {
      if (detailOpen) return;
      const moved = Math.abs(x.get()) + Math.abs(y.get());
      if (moved > 6) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const isLeft = e.clientX - rect.left < rect.width / 2;
      if (isLeft) setPhotoIdx((i) => Math.max(0, i - 1));
      else setPhotoIdx((i) => Math.min(photos.length - 1, i + 1));
    };

    // Direct DOM mutation for label opacity — avoids re-rendering the
    // entire card 60+ times per drag (huge perf win on lower-end devices).
    const recompute = useCallback(() => {
      const w = getVW();
      const dx = x.get();
      const dy = y.get();
      const t = w * 0.25;
      const like = Math.max(0, Math.min(1, dx / t));
      const nope = Math.max(0, Math.min(1, -dx / t));
      const sup = Math.max(0, Math.min(1, -dy / 180));
      if (likeLabelRef.current) likeLabelRef.current.style.opacity = String(like);
      if (nopeLabelRef.current) nopeLabelRef.current.style.opacity = String(nope);
      if (supLabelRef.current) supLabelRef.current.style.opacity = String(sup);
    }, [x, y]);
    useEffect(() => { recompute(); }, [recompute]);
    useMotionValueEvent(x, "change", recompute);
    useMotionValueEvent(y, "change", recompute);

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
          onClick={onClickPhoto}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            touchAction: "pan-y",
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
                {profile.name}
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
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: "#0a0a0a",
              color: "#fff",
              overflowY: "auto",
              paddingBottom: 120,
              borderRadius: 0,
            }}
          >
            {profile.photos[0] && (
              <img
                src={profile.photos[0]}
                alt=""
                style={{
                  width: "100%",
                  height: "55%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
            <button
              onClick={() => setDetailOpen(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Fechar"
            >
              <ChevronDown size={22} />
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
