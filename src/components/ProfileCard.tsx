import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  type ReactNode,
} from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { ArrowUp, MapPin, ChevronDown } from 'lucide-react';
import { Profile, SwipeDirection } from '@/types/dating';
import { VerifiedBadge } from './VerifiedBadge';
import { PremiumBadge } from './PremiumBadge';
import { ActivityStatus } from './ActivityStatus';
import { PromptCard } from './PromptCard';
import type { ProfilePrompt } from '@/hooks/useProfilePrompts';
import { transformImage, buildSrcSet } from '@/lib/optimizedImage';
import { prefetchPhotos, injectPreloadLinks, isImageReady } from '@/lib/imagePrefetch';
import { hapticTick, hapticLike, hapticPass, hapticSuperLike } from '@/lib/haptics';

type CardProfile = Profile & {
  is_verified?: boolean;
  is_premium?: boolean;
  prompts?: ProfilePrompt[];
};

interface ProfileCardProps {
  profile: CardProfile;
  onSwipe: (direction: SwipeDirection) => void;
  isTop: boolean;
  onScrollChange?: (visible: boolean) => void;
  nextProfiles?: CardProfile[];
  /**
   * Optional shared MotionValues — kept for compatibility with SwipeActions
   * and any consumers that read drag offset. We sync them from raw DOM
   * coords during pointer move (writing to a MotionValue does NOT trigger
   * a React render).
   */
  sharedX?: MotionValue<number>;
  sharedY?: MotionValue<number>;
  actions?: ReactNode;
  panelActions?: ReactNode;
  /** Override enter animation. 'rewind' = reverse-swipe back from left. */
  enterAnim?: ProfileCardEnterAnim;
}

export type ProfileCardEnterAnim =
  | 'rewind'
  | 'rewind-left'
  | 'rewind-right'
  | 'rewind-up'
  | null
  | undefined;

export interface ProfileCardHandle {
  flyLeft: () => void;
  flyRight: () => void;
  flyUp: () => void;
}

type Slide =
  | { kind: 'photo'; src: string }
  | { kind: 'prompt'; question: string; answer: string };

const buildSlides = (p: CardProfile): Slide[] => {
  const arr: Slide[] = [];
  const photos = p.photos || [];
  const prompts = p.prompts || [];
  const insertAfter = [1, 3, 5];
  let promptIdx = 0;
  photos.forEach((src, i) => {
    arr.push({ kind: 'photo', src });
    if (insertAfter.includes(i) && promptIdx < prompts.length) {
      const pr = prompts[promptIdx++];
      arr.push({ kind: 'prompt', question: pr.question, answer: pr.answer });
    }
  });
  while (promptIdx < prompts.length) {
    const pr = prompts[promptIdx++];
    arr.push({ kind: 'prompt', question: pr.question, answer: pr.answer });
  }
  return arr;
};

const getVW = () => (typeof window !== 'undefined' ? window.innerWidth : 390);
const getVH = () => (typeof window !== 'undefined' ? window.innerHeight : 800);

/* ============================================================
 * StackCard — non-interactive card behind the top card.
 * Reacts to sharedX/sharedY by writing transforms directly to
 * the DOM (no React re-render, no Framer animator on the
 * transform itself).
 * ============================================================ */
interface StackCardProps {
  profile: CardProfile;
  topX: MotionValue<number>;
  topY: MotionValue<number>;
  stackIndex: 1 | 2;
}

const StackCard = ({ profile, topX, topY, stackIndex }: StackCardProps) => {
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
      // Stack peek: shrink + push down so left/right/bottom edges peek out
      // from under the top card, giving the "deck of cards" feel.
      const scale = 0.94 + progress * 0.06;
      const ty = 10 - progress * 10;
      // Subtle counter-parallax: as the top card drifts one way, the card
      // underneath drifts slightly the opposite way. Makes the stack feel
      // like physically separated layers, not a flat sticker.
      const tx = -dx * 0.025;
      // Keep an imperceptible blur to retain the GPU layer (prevents a
      // repaint flash when this card is promoted to top).
      const blur = Math.max(0.001, 0.6 - progress * 0.6);
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty}px, 0) scale(${scale})`;
      el.style.filter = `blur(${blur.toFixed(3)}px)`;
    } else {
      // Stack-2 also gets a tinier counter-parallax for layered depth.
      const tx2 = -dx * 0.012;
      const scale2 = 0.88 + progress * 0.03;
      const ty2 = 20 - progress * 6;
      el.style.transform = `translate3d(${tx2.toFixed(2)}px, ${ty2}px, 0) scale(${scale2.toFixed(3)})`;
      el.style.filter = 'blur(1.5px)';
    }
  }, [stackIndex, topX, topY]);

  useEffect(() => { apply(); }, [apply]);
  useMotionValueEvent(topX, 'change', apply);
  useMotionValueEvent(topY, 'change', apply);

  const slide = useMemo(() => buildSlides(profile)[0], [profile]);
  const stackPhotoSrc = slide?.kind === 'photo' ? slide.src : profile.photos[0];
  const stackOptimized = useMemo(
    () => (stackPhotoSrc ? transformImage(stackPhotoSrc, { width: 800, quality: 70 }) : ''),
    [stackPhotoSrc]
  );
  const [stackReady, setStackReady] = useState(() =>
    stackOptimized ? isImageReady(stackOptimized) : true
  );
  useEffect(() => {
    if (!stackOptimized) return;
    if (isImageReady(stackOptimized)) { setStackReady(true); return; }
    setStackReady(false);
    const img = new Image();
    img.src = stackOptimized;
    let cancelled = false;
    (img.decode ? img.decode() : Promise.resolve())
      .then(() => { if (!cancelled) setStackReady(true); })
      .catch(() => { if (!cancelled) setStackReady(true); });
    return () => { cancelled = true; };
  }, [stackOptimized]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden profile-card"
      style={{
        opacity: stackIndex === 1 ? 1 : 0.001, // composite-only, no paint cost
        zIndex: stackIndex === 1 ? 9 : 8,
        pointerEvents: 'none',
        background: '#000000',
        borderRadius: 24,
        willChange: 'transform, filter, opacity',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: stackIndex === 1
          ? 'translate3d(0,10px,0) scale(0.94)'
          : 'translate3d(0,20px,0) scale(0.88)',
        filter: stackIndex === 1 ? 'blur(0.6px)' : 'blur(1.5px)',
      }}
    >
      {/* Skeleton placeholder while next-card photo decodes */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, #141414 0%, #1f1f1f 50%, #141414 100%)',
          backgroundSize: '200% 200%',
          animation: stackReady ? 'none' : 'cardSkeletonShimmer 1.6s ease-in-out infinite',
          opacity: stackReady ? 0 : 1,
          transition: 'opacity 220ms ease-out',
        }}
      />
      {slide?.kind === 'prompt' ? (
        <PromptCard question={slide.question} answer={slide.answer} height="100%" />
      ) : (
        <img
          src={stackOptimized}
          alt={profile.name}
          className="w-full h-full object-cover"
          style={{
            objectPosition: 'center top',
            background: '#000',
            opacity: stackReady ? 1 : 0,
            transition: 'opacity 220ms ease-out',
          }}
          draggable={false}
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          top: 'auto',
          bottom: 0,
          height: '55%',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.3) 55%, transparent 100%)',
        }}
      />
    </div>
  );
};

/* ============================================================
 * ProfileCard — pure-CSS swipe, native iOS feel.
 * - Pointer events with setPointerCapture
 * - Direct DOM writes via cardRef.style.transform (zero React renders during drag)
 * - CSS transition for fly-off + spring-back
 * - sharedX/sharedY MotionValues kept in sync for SwipeActions and StackCard
 * ============================================================ */
export const ProfileCard = forwardRef<ProfileCardHandle, ProfileCardProps>(
  ({ profile, onSwipe, isTop, nextProfiles = [], sharedX, sharedY, actions, panelActions, enterAnim }, ref) => {
  const slides = useMemo(() => buildSlides(profile), [profile]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  useEffect(() => {
    if (!isTop) return;
    document.body.classList.toggle('profile-info-open', isInfoOpen);
    return () => document.body.classList.remove('profile-info-open');
  }, [isInfoOpen, isTop]);
  const [showLike, setShowLike] = useState(false);
  const [showNope, setShowNope] = useState(false);
  const [showSuper, setShowSuper] = useState(false);

  // Keep MotionValues for SwipeActions & StackCard reactivity.
  const internalX = useMotionValue(0);
  const internalY = useMotionValue(0);
  const x = sharedX ?? internalX;
  const y = sharedY ?? internalY;

  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const startTime = useRef(0);
  const isDragging = useRef(false);
  const hasDecided = useRef(false);
  const rafId = useRef<number | null>(null);
  // Refs to overlay stamps — written directly for zero React renders.
  const likeStampRef = useRef<HTMLDivElement>(null);
  const nopeStampRef = useRef<HTMLDivElement>(null);
  const superStampRef = useRef<HTMLDivElement>(null);
  const rewindStampRef = useRef<HTMLDivElement>(null);
  // Super Like visual effect refs
  const superGlowRef = useRef<HTMLDivElement>(null);
  const superParticlesRef = useRef<HTMLDivElement>(null);
  // Actions wrapper — faded out in sync with fly-off so buttons exit smoothly
  // even when triggered by a button tap (not just drag).
  const actionsWrapRef = useRef<HTMLDivElement>(null);
  const superAuraRef = useRef<HTMLDivElement>(null);
  // Track threshold-crossing for a single haptic "tick" feedback.
  const crossedThreshold = useRef<null | 'like' | 'nope' | 'super'>(null);
  // Recent samples for instantaneous velocity (px/ms) at release.
  const samples = useRef<{ x: number; y: number; t: number }[]>([]);

  const THRESHOLD = useMemo(() => getVW() * 0.42, []);
  const SUPER_THRESHOLD = useMemo(() => getVH() * 0.3, []);
  // More intentional — requires a deliberate flick to commit.
  const VELOCITY_THRESHOLD = 0.65; // px/ms
  const INERTIA_MS = 320;          // how far the projection looks ahead
  const DEAD_ZONE = 8;             // px — ignore tiny movements
  // 1.0 = card glued to the finger (premium native feel). Resistance is
  // applied later only via the spring-back / inertia projection.
  const DRAG_RESISTANCE = 1.0;

  const writeTransform = useCallback((rawDx: number, rawDy: number) => {
    const el = cardRef.current;
    if (!el) return;
    const dx = rawDx * DRAG_RESISTANCE;
    const dy = rawDy * DRAG_RESISTANCE;
    const w = getVW();
    const h = getVH();
    // Slightly stronger rotation, but capped so it never feels cartoonish.
    const rotation = Math.max(-15, Math.min(15, (dx / w) * 15));
    // Subtle "pickup" scale that breathes up as the card moves further.
    const dist = Math.hypot(dx, dy);
    const liftProgress = Math.min(1, dist / (w * 0.5));
    const scale = 1 + liftProgress * 0.018; // up to +1.8%
    el.style.transition = 'none';
    el.style.transform =
      `translate3d(${dx}px, ${dy * 0.42}px, 0) rotate(${rotation}deg) scale(${scale})`;
    // NOTE: depth shadow is intentionally NOT updated per frame.
    // Animating box-shadow forces a full repaint on the compositor each
    // frame and is the #1 cause of jank on mobile WebKit. Instead, a
    // static "lifted" shadow is applied at pointerdown and reverted at
    // pointerup (see onPointerDown / springBack / flyOff).
    // Sync MotionValues so SwipeActions buttons + StackCard react.
    x.set(dx);
    y.set(dy);
    // Drive stamp opacity directly (no React re-render) for buttery feedback.
    const threshold = w * 0.42;
    const isSuperDrag = dy < -40 && Math.abs(dy) > Math.abs(dx);
    // Labels start appearing only after 25% of threshold has been crossed.
    const likeRaw = (dx - threshold * 0.25) / (threshold * 0.75);
    const nopeRaw = (-dx - threshold * 0.25) / (threshold * 0.75);
    const superRaw = (-dy - threshold * 0.25) / (threshold * 0.55);
    const likeOpacity = isSuperDrag ? 0 : Math.max(0, Math.min(1, likeRaw));
    const nopeOpacity = isSuperDrag ? 0 : Math.max(0, Math.min(1, nopeRaw));
    const superOpacity = isSuperDrag ? Math.max(0, Math.min(1, superRaw)) : 0;
    if (likeStampRef.current) {
      likeStampRef.current.style.opacity = String(likeOpacity);
      likeStampRef.current.style.transform = `rotate(-18deg) scale(${0.85 + likeOpacity * 0.2})`;
    }
    if (nopeStampRef.current) {
      nopeStampRef.current.style.opacity = String(nopeOpacity);
      nopeStampRef.current.style.transform = `rotate(18deg) scale(${0.85 + nopeOpacity * 0.2})`;
    }
    if (superStampRef.current) {
      superStampRef.current.style.opacity = String(superOpacity);
      superStampRef.current.style.transform = `translateX(-50%) scale(${0.85 + superOpacity * 0.25})`;
    }

    // ===== SUPER LIKE VISUAL EFFECTS =====
    const superIntensity = isSuperDrag ? Math.max(0, Math.min(1, superRaw)) : 0;

    // 1. Blue glow behind the card that expands as drag goes up
    if (superGlowRef.current) {
      const glowScale = 1 + superIntensity * 0.15;
      const glowOpacity = superIntensity * 0.85;
      superGlowRef.current.style.opacity = String(glowOpacity);
      superGlowRef.current.style.transform = `translate3d(${dx * 0.3}px, ${dy * 0.25}px, 0) scale(${glowScale})`;
    }

    // 2. Blue aura overlay on the card photo
    if (superAuraRef.current) {
      superAuraRef.current.style.opacity = String(superIntensity * 0.35);
    }

    // 3. Rising star particles — spawn more particles as intensity grows
    if (superParticlesRef.current) {
      const particleOpacity = superIntensity > 0.3 ? superIntensity : 0;
      superParticlesRef.current.style.opacity = String(particleOpacity);
      // Animate particles upward based on drag progress
      const particleOffset = dy * -0.15; // particles rise faster than card
      superParticlesRef.current.style.transform = `translateY(${particleOffset}px)`;
    }

    // Tick haptic when crossing the commit threshold for the first time.
    let nowCrossed: null | 'like' | 'nope' | 'super' = null;
    if (superOpacity >= 1) nowCrossed = 'super';
    else if (likeOpacity >= 1) nowCrossed = 'like';
    else if (nopeOpacity >= 1) nowCrossed = 'nope';
    if (nowCrossed && nowCrossed !== crossedThreshold.current) {
      crossedThreshold.current = nowCrossed;
      hapticTick();
    } else if (!nowCrossed && crossedThreshold.current) {
      crossedThreshold.current = null;
    }
  }, [x, y]);

  const flyOff = useCallback((direction: 'left' | 'right' | 'up', speed = 1, opts?: { slow?: boolean }) => {
    if (hasDecided.current) return;
    hasDecided.current = true;
    const el = cardRef.current;
    if (!el) {
      onSwipe(direction === 'right' ? 'right' : direction === 'left' ? 'left' : 'up');
      return;
    }
    const w = getVW();
    const h = getVH();

    // For super like, add a burst of glow before flying off
    if (direction === 'up') {
      if (superGlowRef.current) {
        superGlowRef.current.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out';
        superGlowRef.current.style.transform = `translate3d(0px, ${-h * 0.3}px, 0) scale(1.6)`;
        superGlowRef.current.style.opacity = '0';
      }
      if (superAuraRef.current) {
        superAuraRef.current.style.transition = 'opacity 200ms ease-out';
        superAuraRef.current.style.opacity = '0';
      }
      if (superParticlesRef.current) {
        superParticlesRef.current.style.transition = 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease-out';
        superParticlesRef.current.style.transform = `translateY(${-h * 0.6}px)`;
        superParticlesRef.current.style.opacity = '0';
      }
    }

    const transforms = {
      // Slight scale-down on exit mirrors the scale-up on entrance,
      // making the swap feel like a single continuous motion.
      right: `translate3d(${w * 1.5}px, -${h * 0.08}px, 0) rotate(24deg) scale(0.96)`,
      left:  `translate3d(${-w * 1.5}px, -${h * 0.08}px, 0) rotate(-24deg) scale(0.96)`,
      up:    `translate3d(0px, ${-h * 1.3}px, 0) rotate(0deg) scale(0.96)`,
    } as const;
    // Faster fly-off when the user flicks hard — feels like real momentum.
    // Button taps use a longer, more deliberate duration so the swap feels
    // intentional instead of snappy.
    const dur = opts?.slow
      ? 520
      : Math.max(200, Math.min(360, 340 / Math.max(0.6, speed)));
    // Same easing family as the entrance (cubic-bezier(0.16, 1, 0.3, 1))
    // so out → in feels like one continuous spring.
    el.style.transition =
      `transform ${dur}ms cubic-bezier(0.16, 1, 0.3, 1), ` +
      `opacity ${Math.round(dur * 0.85)}ms cubic-bezier(0.4, 0, 1, 1), ` +
      `filter ${Math.round(dur * 0.7)}ms ease-out`;
    el.style.transform = transforms[direction];
    el.style.opacity = '0';
    // Subtle blur ramp matches the entrance fade-out of blur — kills the
    // hard-edged "pop" at the end of the fly-off.
    el.style.filter = 'blur(1.4px)';

    if (direction === 'right') hapticLike();
    else if (direction === 'up') hapticSuperLike();
    else hapticPass();

    // Fade + soft scale-down on the action buttons so they exit smoothly
    // alongside the card (works for both drag and button-tap paths).
    if (actionsWrapRef.current) {
      const aDur = Math.round(dur * 0.7);
      actionsWrapRef.current.style.transition =
        `opacity ${aDur}ms ease-out, transform ${aDur}ms cubic-bezier(0.4, 0, 1, 1)`;
      actionsWrapRef.current.style.opacity = '0';
      actionsWrapRef.current.style.transform = 'translateY(8px) scale(0.92)';
    }

    window.setTimeout(() => {
      // Reset shared motion values so the next mounted top card starts at 0.
      x.set(0);
      y.set(0);
      onSwipe(direction === 'right' ? 'right' : direction === 'left' ? 'left' : 'up');
    }, dur);
  }, [onSwipe, x, y]);

  const springBack = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    // Two-stage organic spring: a slight overshoot through identity, then
    // a soft settle. Mimics a real spring with tiny damped oscillation.
    el.style.transition =
      'transform 0.42s cubic-bezier(0.22, 1.25, 0.36, 1), ' +
      'box-shadow 0.42s cubic-bezier(0.22, 1, 0.36, 1), ' +
      'filter 0.25s ease-out';
    el.style.transform = 'translate3d(0px, 0px, 0) rotate(0deg) scale(1)';
    el.style.filter = 'blur(0.001px)';
    el.style.boxShadow =
      'inset 0 -1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.35)';
    x.set(0);
    y.set(0);
    crossedThreshold.current = null;
    [likeStampRef, nopeStampRef, superStampRef].forEach((r) => {
      if (r.current) {
        r.current.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
        r.current.style.opacity = '0';
      }
    });
    // Reset super like effects
    if (superGlowRef.current) {
      superGlowRef.current.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      superGlowRef.current.style.opacity = '0';
      superGlowRef.current.style.transform = 'translate3d(0, 0, 0) scale(1)';
    }
    if (superAuraRef.current) {
      superAuraRef.current.style.transition = 'opacity 0.3s ease-out';
      superAuraRef.current.style.opacity = '0';
    }
    if (superParticlesRef.current) {
      superParticlesRef.current.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      superParticlesRef.current.style.opacity = '0';
      superParticlesRef.current.style.transform = 'translateY(0)';
    }
  }, [x, y]);

  useImperativeHandle(ref, () => ({
    flyLeft: () => flyOff('left', 1, { slow: true }),
    flyRight: () => flyOff('right', 1, { slow: true }),
    flyUp: () => flyOff('up', 1, { slow: true }),
  }), [flyOff]);

  // Reset DOM + state on profile change. When this card is the *top* card
  // (i.e. just got promoted from stack position 1), animate from the
  // stack-1 visual state up to identity so the user perceives a smooth
  // promotion instead of a jump.
  //
  // CRITICAL: useLayoutEffect (not useEffect) runs synchronously *before*
  // the browser paints. Without this, React paints the new top card at
  // identity for one frame, then we snap it to the stack-1 state — that
  // single frame is the visible "pop/click".
  useLayoutEffect(() => {
    setCurrentSlide(0);
    setIsInfoOpen(false);
    setShowLike(false);
    setShowNope(false);
    setShowSuper(false);
    hasDecided.current = false;
    isDragging.current = false;
    x.set(0);
    y.set(0);
    // Animate the action-buttons wrapper IN with a smooth bubble-up so
    // every new top card (next swipe OR rewind) gets the same entrance
    // as after a button-tap fly-off. For rewind we delay slightly so the
    // buttons land in sync with the card finishing its reverse flight.
    if (isTop && actionsWrapRef.current) {
      const wrap = actionsWrapRef.current;
      const isRewind =
        enterAnim === 'rewind' ||
        enterAnim === 'rewind-left' ||
        enterAnim === 'rewind-right' ||
        enterAnim === 'rewind-up';
      const delay = isRewind ? 220 : 0;
      wrap.style.transition = 'none';
      wrap.style.opacity = '0';
      wrap.style.transform = 'translateY(10px) scale(0.92)';
      void wrap.offsetWidth;
      wrap.style.transition =
        `opacity 320ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms, ` +
        `transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`;
      wrap.style.opacity = '1';
      wrap.style.transform = 'translateY(0) scale(1)';
    } else if (actionsWrapRef.current) {
      actionsWrapRef.current.style.transition = 'none';
      actionsWrapRef.current.style.opacity = '1';
      actionsWrapRef.current.style.transform = 'translateY(0) scale(1)';
    }
    const el = cardRef.current;
    if (!el) return;
    if (isTop) {
      if (
        enterAnim === 'rewind' ||
        enterAnim === 'rewind-left' ||
        enterAnim === 'rewind-right' ||
        enterAnim === 'rewind-up'
      ) {
        // REWIND IN — reverse-swipe animation. Start off-screen on the
        // side the card was thrown to, rotated, then spring back to
        // identity. Direction mirrors the original fly-off.
        const w = window.innerWidth || 390;
        const h = window.innerHeight || 844;
        // Default ('rewind') = back from left (legacy behaviour).
        let startX = -w * 1.15;
        let startY = 0;
        let startRot = -14;
        if (enterAnim === 'rewind-right') {
          startX = w * 1.15;
          startY = 0;
          startRot = 14;
        } else if (enterAnim === 'rewind-up') {
          startX = 0;
          startY = -h * 1.05;
          startRot = 0;
        }
        // Pure-transform animation: no blur, no opacity fade and no
        // overshoot easing — those were the source of the jitter on
        // mobile. A single ease-out curve on transform feels smooth and
        // matches the fly-off motion in reverse.
        el.style.willChange = 'transform';
        el.style.transition = 'none';
        el.style.transform = `translate3d(${startX}px, ${startY}px, 0) rotate(${startRot}deg)`;
        el.style.filter = '';
        el.style.opacity = '1';
        void el.offsetWidth;
        // VOLTAR stamp — fade in as the card flies back, then fade out.
        const stamp = rewindStampRef.current;
        if (stamp) {
          stamp.style.transition = 'none';
          stamp.style.opacity = '0';
          stamp.style.transform = 'translateX(-50%) scale(0.8)';
        }
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const node = cardRef.current;
            if (!node) return;
            node.style.transition =
              'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)';
            node.style.transform = 'translate3d(0px, 0px, 0) rotate(0deg)';
            const s = rewindStampRef.current;
            if (s) {
              s.style.transition =
                'opacity 180ms ease-out, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
              s.style.opacity = '1';
              s.style.transform = 'translateX(-50%) scale(1.05)';
            }
          });
        });
        window.setTimeout(() => {
          const node = cardRef.current;
          if (node) node.style.willChange = '';
        }, 520);
        window.setTimeout(() => {
          const s = rewindStampRef.current;
          if (!s) return;
          s.style.transition =
            'opacity 220ms ease-out, transform 220ms ease-out';
          s.style.opacity = '0';
          s.style.transform = 'translateX(-50%) scale(0.92)';
        }, 520);
        return;
      }
      // 1) Synchronously match the StackCard's exact final state.
      //    Because useLayoutEffect runs before paint, the user never sees
    //    the identity-state intermediate frame.
      el.style.transition = 'none';
      el.style.transform = 'translate3d(0px, 16px, 0) scale(0.92)';
      el.style.filter = 'blur(2px)';
      el.style.opacity = '1';
      // 2) Force a layout flush, then animate to identity on the next frame.
      void el.offsetWidth;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const node = cardRef.current;
          if (!node) return;
          node.style.transition =
            // Same easing family as the fly-off — out → in feels like
            // one continuous spring motion.
            'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), ' +
            'filter 240ms cubic-bezier(0.16, 1, 0.3, 1)';
          node.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
          node.style.filter = 'blur(0.001px)';
        });
      });
    } else {
      el.style.transition = 'none';
      el.style.transform = 'translate3d(0px, 0px, 0) rotate(0deg)';
      el.style.opacity = '1';
    }
  }, [profile.id, isTop, x, y]);

  // Aggressive prefetch + decode of upcoming profiles' photos.
  // We decode every responsive width used by the <img srcSet>, so by the
  // time a card is promoted to the top its bitmap is already in memory
  // and the browser paints it on the next frame — no network, no decode.
  useEffect(() => {
    // Preload hints for the very next card help the HTTP layer prioritize.
    const hintUrls: string[] = [];
    nextProfiles.slice(0, 2).forEach((p) => {
      p.photos?.slice(0, 1).forEach((u) => {
        if (u) hintUrls.push(transformImage(u, { width: 800, quality: 78 }));
      });
    });
    const cleanupLinks = injectPreloadLinks(hintUrls);

    // Decode current profile (all photos) immediately.
    const tasks: Promise<void>[] = [];
    tasks.push(prefetchPhotos(profile.photos));
    // Then chain the next two profiles — first photo is highest priority,
    // remaining photos warm the cache for the bio panel.
    nextProfiles.slice(0, 2).forEach((p, idx) => {
      // Stagger slightly so the very-next card finishes first.
      const delay = idx * 50;
      tasks.push(
        new Promise<void>((resolve) => {
          window.setTimeout(() => prefetchPhotos(p.photos).then(resolve), delay);
        })
      );
    });

    return () => { cleanupLinks(); };
  }, [profile.id, nextProfiles]);

  // Top photo decode-gate
  const topPhotoSrc = useMemo(() => {
    const raw = slides.find((s) => s.kind === 'photo') as
      | { kind: 'photo'; src: string }
      | undefined;
    return raw ? transformImage(raw.src, { width: 800, quality: 78 }) : '';
  }, [slides]);
  // Lazy-init: if the first photo is already decoded in cache (very
  // common for the very-next/previous card), skip the skeleton entirely
  // so the very first render paints the photo. This eliminates the
  // one-frame flicker seen on rewind, where the cached photo would
  // otherwise blink through the skeleton between mount and effect.
  const [topImageReady, setTopImageReady] = useState(() => {
    try {
      const raw = (profile.photos || []).find(Boolean);
      if (!raw) return false;
      return isImageReady(transformImage(raw, { width: 800, quality: 78 }));
    } catch {
      return false;
    }
  });
  // Tracks the optimized URL of the most recently decoded carousel slide,
  // so subsequent slide swaps crossfade through the skeleton instead of
  // hard-cutting.
  const [slideLoadedSrc, setSlideLoadedSrc] = useState<string>('');
  // Last fully-decoded slide src — kept painted underneath the incoming
  // slide so swaps crossfade through a real photo instead of a skeleton.
  const [previousLoadedSrc, setPreviousLoadedSrc] = useState<string>('');
  useEffect(() => {
    if (!topPhotoSrc) return;
    // If the prefetch cache already has this URL decoded, skip the gate
    // entirely — the bitmap is in memory and will paint immediately.
    if (isImageReady(topPhotoSrc)) {
      setTopImageReady(true);
      return;
    }
    setTopImageReady(false);
    const img = new Image();
    img.src = topPhotoSrc;
    let cancelled = false;
    (img.decode ? img.decode() : Promise.resolve())
      .then(() => { if (!cancelled) setTopImageReady(true); })
      .catch(() => { if (!cancelled) setTopImageReady(true); });
    return () => { cancelled = true; };
  }, [topPhotoSrc]);

  /* ----- Pointer handlers ----- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTop || isInfoOpen) return;
    if ((e.target as HTMLElement).closest('button')) return;
    try { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); } catch {}
    isDragging.current = true;
    hasDecided.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    currentPos.current = { x: 0, y: 0 };
    startTime.current = Date.now();
    samples.current = [{ x: 0, y: 0, t: performance.now() }];
    const el = cardRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.willChange = 'transform';
      // Apply a static "lifted" shadow once on pickup — animating
      // box-shadow per frame is the heaviest paint op on mobile WebKit,
      // so we transition it ONCE here and revert ONCE on release.
      el.style.transition = 'box-shadow 180ms ease-out';
      el.style.boxShadow =
        '0 26px 56px -18px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.08)';
      // Force the next writeTransform to clear the transition so the
      // transform itself stays driven directly (no interpolation).
      requestAnimationFrame(() => {
        if (cardRef.current && isDragging.current) {
          cardRef.current.style.transition = 'none';
        }
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    // Dead zone — ignore micro-movements so a tap-and-tiny-jitter doesn't
    // start dragging the card.
    if (Math.hypot(dx, dy) < DEAD_ZONE) return;
    currentPos.current = { x: dx, y: dy };
    // Keep last ~100ms of samples for accurate release velocity.
    // Wider window survives the brief slowdown right before finger lift.
    const now = performance.now();
    samples.current.push({ x: dx, y: dy, t: now });
    while (samples.current.length > 2 && now - samples.current[0].t > 100) {
      samples.current.shift();
    }
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      writeTransform(currentPos.current.x, currentPos.current.y);
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    const { x: dx, y: dy } = currentPos.current;
    // Instantaneous velocity from the last samples. Fall back to total
    // displacement/time when only one sample exists (very fast swipes).
    const last = samples.current[samples.current.length - 1];
    const first = samples.current[0];
    const sdt = Math.max(1, last.t - first.t);
    let vx = (last.x - first.x) / sdt; // px/ms
    let vy = (last.y - first.y) / sdt;
    if (samples.current.length < 2 || sdt < 16) {
      const total = Math.max(1, performance.now() - (samples.current[0]?.t ?? performance.now()));
      vx = dx / total;
      vy = dy / total;
    }
    const dt = Math.max(1, Date.now() - startTime.current);
    const isTap = Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 250;

    const el = cardRef.current;
    if (el) el.style.willChange = 'auto';

    if (isTap) {
      // Photo navigation tap
      const cardEl = cardRef.current;
      if (!cardEl) return;
      const rect = cardEl.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      if (tapX < rect.width * 0.35) {
        setCurrentSlide((p) => Math.max(0, p - 1));
      } else if (tapX > rect.width * 0.65) {
        setCurrentSlide((p) => Math.min(slides.length - 1, p + 1));
      }
      return;
    }

    // Project where the card would land after inertia (current pos + velocity * lookahead).
    const projX = dx + vx * INERTIA_MS;
    const projY = dy + vy * INERTIA_MS;
    const absX = Math.abs(projX);
    const absY = Math.abs(projY);
    const speed = Math.hypot(vx, vy) / 0.6; // 1.0 ≈ a normal flick

    if (
      (projY < -SUPER_THRESHOLD || vy < -VELOCITY_THRESHOLD) &&
      absY > absX * 1.5
    ) {
      flyOff('up', speed);
    } else if (projX > THRESHOLD || (vx > VELOCITY_THRESHOLD && projX > 60)) {
      flyOff('right', speed);
    } else if (projX < -THRESHOLD || (vx < -VELOCITY_THRESHOLD && projX < -60)) {
      flyOff('left', speed);
    } else {
      springBack();
    }
  };

  const activeSlide = slides[currentSlide];
  const isPromptSlide = activeSlide?.kind === 'prompt';

  // Drag-progress for overlay opacity (read from latest currentPos on each render via state showLike/Nope/Super).
  // For smooth opacity we derive from currentPos directly during render not feasible without re-render —
  // instead overlays just fade in/out via CSS transition based on show* booleans.

  return (
    <div
      className="absolute left-0 right-0 top-0 flex items-start justify-center swipe-card-container card-stack"
      style={{
        background: 'transparent',
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 18px) + 54px + 10px)',
        contain: 'strict' as any,
        isolation: 'isolate',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      {nextProfiles[1] && (
        <StackCard profile={nextProfiles[1]} topX={x} topY={y} stackIndex={2} />
      )}
      {nextProfiles[0] && (
        <StackCard profile={nextProfiles[0]} topX={x} topY={y} stackIndex={1} />
      )}

      {/* Super Like visual effects layer — sits behind the top card */}
      <div
        ref={superGlowRef}
        style={{
          position: 'absolute',
          inset: -20,
          borderRadius: 36,
          background: 'radial-gradient(ellipse at center, rgba(26,111,255,0.5) 0%, rgba(26,111,255,0.15) 40%, transparent 70%)',
          opacity: 0,
          zIndex: 5,
          pointerEvents: 'none',
          transition: 'none',
          transform: 'translate3d(0,0,0) scale(1)',
          willChange: 'transform, opacity',
        }}
      />

      {/* Super Like blue aura overlay on the card */}
      <div
        ref={superAuraRef}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(26,111,255,0.25) 0%, rgba(10,60,180,0.15) 50%, rgba(26,111,255,0.05) 100%)',
          mixBlendMode: 'screen',
          opacity: 0,
          zIndex: 7,
          pointerEvents: 'none',
          transition: 'none',
        }}
      />

      {/* Rising star particles for Super Like */}
      <div
        ref={superParticlesRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '60%',
          zIndex: 6,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'none',
          overflow: 'hidden',
        }}
      >
        {[
          { left: '12%', size: 4, delay: 0, duration: 1.2 },
          { left: '28%', size: 6, delay: 0.15, duration: 1.5 },
          { left: '42%', size: 3, delay: 0.3, duration: 1.0 },
          { left: '58%', size: 5, delay: 0.1, duration: 1.3 },
          { left: '72%', size: 4, delay: 0.25, duration: 1.1 },
          { left: '88%', size: 6, delay: 0.05, duration: 1.4 },
          { left: '18%', size: 3, delay: 0.4, duration: 0.9 },
          { left: '50%', size: 5, delay: 0.2, duration: 1.6 },
          { left: '82%', size: 4, delay: 0.35, duration: 1.2 },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: `${10 + (i % 3) * 15}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: '#60a5ff',
              boxShadow: `0 0 ${p.size * 2}px ${p.size}px rgba(96,165,255,0.6)`,
              animation: `superRise ${p.duration}s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}
        {/* Larger sparkle crosses */}
        {[
          { left: '22%', delay: 0.1 },
          { left: '48%', delay: 0.3 },
          { left: '75%', delay: 0.5 },
        ].map((p, i) => (
          <svg
            key={`sparkle-${i}`}
            style={{
              position: 'absolute',
              left: p.left,
              bottom: `${20 + i * 20}%`,
              width: 12 + i * 4,
              height: 12 + i * 4,
              animation: `superRise 1.8s ease-out ${p.delay}s infinite`,
            }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z"
              fill="rgba(147,197,253,0.9)"
            />
          </svg>
        ))}
      </div>

      {/* Top draggable card — pure DOM, no Framer drag */}
      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative',
          width: '100vw',
          height: '100%',
          background: '#000000',
          borderRadius: 24,
          overflow: 'hidden',
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.35)',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          // Always-on GPU promotion + imperceptible blur keeps the
          // compositor layer alive across stack transitions, eliminating
          // the iOS PWA repaint flash when a new card becomes top.
          willChange: 'transform, filter',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          filter: 'blur(0.001px)',
          zIndex: isTop ? 10 : 0,
          cursor: isTop ? 'grab' : 'default',
          transform: 'translate3d(0,0,0) rotate(0deg)',
        }}
        className="profile-card swipe-card"
        data-no-select
      >
        {activeSlide?.kind === 'prompt' ? (
          <PromptCard question={activeSlide.question} answer={activeSlide.answer} height="100%" />
        ) : (
          (() => {
            const rawSrc = activeSlide?.kind === 'photo' ? activeSlide.src : profile.photos[0];
            const isFirstSlide = currentSlide === 0;
            const optimizedSrc = transformImage(rawSrc, { width: 800, quality: 78 });
            // First slide uses the dedicated decode gate (warmed by prefetch).
            // Other slides crossfade based on whether their bitmap is already
            // decoded — if not, show the skeleton until <img onLoad>.
            const ready = isFirstSlide
              ? topImageReady
              : (slideLoadedSrc === optimizedSrc || isImageReady(optimizedSrc));
            // Show the previously-decoded slide underneath so the transition
            // never reveals the skeleton. Only render it if it's a different
            // src that has actually painted before.
            const showPrev =
              !ready && !!previousLoadedSrc && previousLoadedSrc !== optimizedSrc;
            return (
              <>
                {/* Dark base behind the photo — kept solid (no shimmer) so
                    nothing flickers if both decoded layers are missing. */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background: '#0a0a0a',
                    pointerEvents: 'none',
                    transform: 'translateZ(0)',
                  }}
                />
                {showPrev && (
                  <img
                    key={`prev-${previousLoadedSrc}`}
                    src={previousLoadedSrc}
                    alt=""
                    aria-hidden
                    className="w-full h-full object-cover"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectPosition: 'center top',
                      display: 'block',
                      zIndex: 2,
                      pointerEvents: 'none',
                      userSelect: 'none',
                      opacity: 1,
                      transform: 'translateZ(0)',
                    }}
                    draggable={false}
                    decoding="sync"
                  />
                )}
                <img
                src={optimizedSrc}
                srcSet={buildSrcSet(rawSrc, [480, 800, 1080], { quality: 78 })}
                sizes="(max-width: 768px) 100vw, 480px"
                alt={profile.name}
                className="w-full h-full object-cover"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectPosition: 'center top',
                  background: '#0a0a0a',
                  display: 'block',
                  zIndex: 3,
                  pointerEvents: 'none',
                  userSelect: 'none',
                  opacity: ready ? 1 : 0,
                  filter: ready ? 'blur(0.001px)' : 'blur(14px)',
                  transform: ready
                    ? 'translateZ(0) scale(1)'
                    : 'translateZ(0) scale(1.04)',
                  transition:
                    'opacity 360ms ease-out, filter 420ms ease-out, transform 420ms ease-out',
                  willChange: 'opacity, filter, transform',
                }}
                draggable={false}
                loading="eager"
                decoding="async"
                onLoad={(e) => {
                  const el = e.currentTarget;
                  const mark = () => {
                    setSlideLoadedSrc(optimizedSrc);
                    setPreviousLoadedSrc(optimizedSrc);
                  };
                  if (typeof el.decode === 'function') {
                    el.decode().then(mark).catch(mark);
                  } else {
                    mark();
                  }
                }}
                />
              </>
            );
          })()
        )}

        {slides.length > 1 && (
          <div
            className="absolute flex z-20 pointer-events-none justify-center"
            style={{
              top: 'calc(max(var(--sat, 54px), 54px) + 52px)',
              left: 0,
              right: 0,
              gap: '3px',
            }}
          >
            {slides.map((_, idx) => (
              <div
                key={idx}
                className="rounded-[1px] transition-all duration-200"
                style={{
                  width: idx === currentSlide ? 16 : 5,
                  height: 2,
                  background:
                    idx === currentSlide
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.35)',
                }}
              />
            ))}
          </div>
        )}

        {profile.hasSuperLikedMe && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: '3px solid #0A84FF',
                boxShadow: '0 0 24px rgba(10,132,255,0.45), inset 0 0 24px rgba(10,132,255,0.15)',
                zIndex: 18,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(max(var(--sat, 54px), 54px) + 64px)',
                right: 14,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#0A84FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(10,132,255,0.55)',
                zIndex: 19,
                pointerEvents: 'none',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </>
        )}

        {/* LIKE stamp — Tinder-style */}
        <div
          ref={likeStampRef}
          style={{
            position: 'absolute',
            top: '10%',
            left: 22,
            opacity: 0,
            transform: 'rotate(-18deg) scale(0.85)',
            zIndex: 30,
            pointerEvents: 'none',
            padding: '6px 18px',
            border: '4px solid #2ECC71',
            borderRadius: 12,
            color: '#2ECC71',
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: 2,
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(46,204,113,0.45)',
            boxShadow: '0 0 24px rgba(46,204,113,0.35)',
            background: 'rgba(46,204,113,0.08)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            willChange: 'transform, opacity',
            contain: 'layout paint style' as any,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          GOSTO
        </div>

        {/* NOPE stamp */}
        <div
          ref={nopeStampRef}
          style={{
            position: 'absolute',
            top: '10%',
            right: 22,
            opacity: 0,
            transform: 'rotate(18deg) scale(0.85)',
            zIndex: 30,
            pointerEvents: 'none',
            padding: '6px 18px',
            border: '4px solid #FF4FA3',
            borderRadius: 12,
            color: '#FF4FA3',
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: 2,
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(255, 79, 163,0.45)',
            boxShadow: '0 0 24px rgba(255, 79, 163,0.35)',
            background: 'rgba(255, 79, 163,0.08)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            willChange: 'transform, opacity',
            contain: 'layout paint style' as any,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          NÃO
        </div>

        {/* SUPER LIKE stamp */}
        <div
          ref={superStampRef}
          style={{
            position: 'absolute',
            top: '22%',
            left: '50%',
            opacity: 0,
            transform: 'translateX(-50%) scale(0.85)',
            zIndex: 30,
            pointerEvents: 'none',
            padding: '6px 20px',
            border: '4px solid #1A6FFF',
            borderRadius: 12,
            color: '#1A6FFF',
            fontSize: 38,
            fontWeight: 900,
            letterSpacing: 2,
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(26,111,255,0.45)',
            boxShadow: '0 0 24px rgba(26,111,255,0.4)',
            background: 'rgba(26,111,255,0.08)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            willChange: 'transform, opacity',
            contain: 'layout paint style' as any,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          SUPER LIKE
        </div>

        {/* REWIND stamp — same style family, orange like the rewind button */}
        <div
          ref={rewindStampRef}
          style={{
            position: 'absolute',
            top: '22%',
            left: '50%',
            opacity: 0,
            transform: 'translateX(-50%) scale(0.85)',
            zIndex: 30,
            pointerEvents: 'none',
            padding: '6px 20px',
            border: '4px solid #FFB020',
            borderRadius: 12,
            color: '#FFB020',
            fontSize: 38,
            fontWeight: 900,
            letterSpacing: 2,
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(255,176,32,0.45)',
            boxShadow: '0 0 24px rgba(255,176,32,0.4)',
            background: 'rgba(255,176,32,0.08)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            willChange: 'transform, opacity',
            contain: 'layout paint style' as any,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          VOLTAR
        </div>

        {!isPromptSlide && (
          <div
            className="absolute inset-0 pointer-events-none z-[6]"
            style={{
              top: 'auto',
              bottom: 0,
              height: '55%',
              background:
                'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.3) 55%, transparent 100%)',
            }}
          />
        )}

        {!isPromptSlide && (
          <div
            className="absolute left-0 right-0 z-10"
            style={{
              // Sit above the action buttons row (clears swipe buttons + nav)
              bottom: `calc(var(--card-nav-offset, 66px) - 63px + 92px + 16px)`,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            <div className="flex items-end justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <ActivityStatus
                  isOnline={profile.isOnline}
                  lastSeenAt={profile.lastSeenAt}
                  variant="pill"
                  hideBelow="today"
                  className="mb-2 mr-2"
                />
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-[34px] font-normal text-white leading-[1.05] tracking-tight"
                    style={{ textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}
                  >
                    {profile.name}
                  </span>
                  <span className="text-[28px] font-light text-white/85 leading-[1.05]">
                    {profile.age}
                  </span>
                  {profile.is_verified && <VerifiedBadge size="md" className="ml-1 self-center" />}
                  {profile.is_premium && <PremiumBadge size="sm" />}
                </div>
                {profile.city && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-[13px] h-[13px] text-white/70" strokeWidth={2.4} />
                    <span className="text-[14px] font-medium text-white/75 leading-none">
                      {profile.city}
                      {profile.distance !== undefined && profile.distance > 0
                        ? ` · ${
                            profile.distance < 10
                              ? profile.distance.toFixed(1)
                              : Math.round(profile.distance)
                          } km`
                        : ''}
                    </span>
                  </div>
                )}
              </div>
              <button
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsInfoOpen(true);
                }}
                className="flex items-center justify-center flex-shrink-0 self-end"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  color: 'white',
                }}
                aria-label="Mais info"
              >
                <ArrowUp className="w-[20px] h-[20px]" strokeWidth={2.6} />
              </button>
            </div>

            {profile.interests && profile.interests.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.slice(0, 4).map((interest, i) => (
                    <span
                      key={interest}
                      className="text-[12.5px] font-semibold text-white"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        background:
                          i === 0 ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.12)',
                        border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.16)',
                        backdropFilter: i === 0 ? undefined : 'blur(10px)',
                        WebkitBackdropFilter: i === 0 ? undefined : 'blur(10px)',
                      }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {actions && (
          <div
            ref={actionsWrapRef}
            onPointerDownCapture={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              // Sit just above the floating bottom nav pill — keep the action
              // buttons tucked close to the pill (matches reference layout).
              bottom: `calc(var(--card-nav-offset, 66px) - 80px)`,
              zIndex: 25,
              opacity: isInfoOpen ? 0 : 1,
              pointerEvents: isInfoOpen ? 'none' : 'auto',
              transformOrigin: '50% 100%',
              willChange: 'opacity, transform',
            }}
          >
            {actions}
          </div>
        )}

        {/* Info panel — Framer used here only for slide-up; not on the swipe path */}
        <AnimatePresence>
          {isInfoOpen && (
            <motion.div
              key="info-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
              onPointerDownCapture={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                inset: 0,
                top: 0, left: 0, right: 0, bottom: 0,
                background: '#0a0a0a',
                borderRadius: 0,
                zIndex: 50,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div style={{ width: '100%', height: '55vh', position: 'relative', flexShrink: 0 }}>
                <img
                  src={transformImage(profile.photos[currentSlide] || profile.photos[0], { width: 1080, quality: 80 })}
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  draggable={false}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '40%',
                  background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
                <button
                  onClick={(e) => { e.stopPropagation(); setIsInfoOpen(false); }}
                  style={{
                    position: 'absolute',
                    bottom: 22,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    color: 'hsl(var(--primary))', fontSize: 24, fontWeight: 700,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, zIndex: 5,
                  }}
                  aria-label="Fechar"
                >
                  <ChevronDown className="w-6 h-6" strokeWidth={2.5} />
                </button>
                {profile.photos && profile.photos.length > 1 && (
                  <div style={{
                    position: 'absolute', top: 12, left: 16, right: 16,
                    display: 'flex', gap: 4,
                  }}>
                    {profile.photos.map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i === currentSlide ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.28)',
                        transition: 'background 200ms',
                      }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.8px', color: '#fff' }}>
                    {profile.name}
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.5px', color: 'rgba(255,255,255,0.85)' }}>
                    {profile.age}
                  </span>
                  {profile.is_verified && <VerifiedBadge size="sm" />}
                  {profile.is_premium && <PremiumBadge size="sm" />}
                </div>
                {profile.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
                    <MapPin className="w-[14px] h-[14px]" strokeWidth={2.2} style={{ color: 'rgba(255,255,255,0.45)' }} />
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>
                      {profile.city}
                      {profile.distance !== undefined && profile.distance > 0
                        ? ` · ${profile.distance < 10 ? profile.distance.toFixed(1) : Math.round(profile.distance)} km`
                        : ''}
                    </span>
                  </div>
                )}

                {(panelActions || actions) && (
                  <div onPointerDownCapture={(e) => e.stopPropagation()} style={{ marginBottom: 32 }}>
                    {panelActions || actions}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

              <div style={{ padding: '0 20px 40px' }}>
                {profile.bio && (
                  <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{
                      fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 0,
                    }}>Sobre mim</p>
                    <p style={{
                      fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.6, margin: 0, letterSpacing: '-0.1px', whiteSpace: 'pre-wrap',
                    }}>{profile.bio}</p>
                  </div>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div style={{ padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{
                      fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.3)',
                      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 0,
                    }}>Interesses</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {profile.interests.map((interest, i) => (
                        <span key={interest} style={{
                          padding: '6px 14px', borderRadius: 20,
                          fontSize: 14, fontWeight: 500, letterSpacing: '-0.1px',
                          background: i < 3 ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.08)',
                          border: i < 3 ? 'none' : '1px solid rgba(255,255,255,0.12)',
                          color: '#fff',
                        }}>{interest}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ padding: '20px 0' }}>
                  {[
                    { label: 'Partilhar perfil', color: 'rgba(255,255,255,0.7)' },
                    { label: `Bloquear ${profile.name}`, color: 'rgba(255,255,255,0.7)' },
                    { label: `Denunciar ${profile.name}`, color: 'hsl(var(--primary))' },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%', height: 50,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        color: action.color,
                        fontSize: 16, fontWeight: 400,
                        letterSpacing: '-0.2px',
                        marginBottom: 8,
                        cursor: 'pointer',
                      }}
                    >{action.label}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
});

ProfileCard.displayName = 'ProfileCard';
