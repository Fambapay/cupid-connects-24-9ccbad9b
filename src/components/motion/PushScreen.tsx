import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  animate,
  type HTMLMotionProps,
  type PanInfo,
} from "framer-motion";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { spring } from "@/lib/motion";

export interface PushScreenProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
  /** Called when the user confirms a back gesture (or after exit). */
  onBack: () => void;
  /** Disable the edge-swipe gesture even when in PWA standalone. */
  disableEdgeSwipe?: boolean;
  /** Pixel width of the left-edge zone that starts the gesture (default 20). */
  edgeWidth?: number;
  /** Class for the sliding container. */
  className?: string;
  /** Class for the dim overlay covering the back screen. */
  overlayClassName?: string;
}

/**
 * Detects PWA standalone mode. The edge-swipe-back gesture must NOT be
 * enabled inside a regular Safari tab — it conflicts with the browser's
 * own back gesture. Only standalone (Add-to-Home-Screen) is safe.
 */
function useIsStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia?.("(display-mode: standalone)");
    const update = () => {
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setStandalone(!!mql?.matches || iosStandalone);
    };
    update();
    mql?.addEventListener?.("change", update);
    return () => mql?.removeEventListener?.("change", update);
  }, []);
  return standalone;
}

/**
 * PushScreen — iOS drill-in transition for detail screens.
 *
 * - Slides in from the right (`spring.smooth`, no bounce — iOS push never bounces).
 * - Renders a black dim overlay that fades 0 → 0.18 to fake the back-screen
 *   recede when the actual back screen isn't kept in the DOM. When the parent
 *   keeps both screens mounted, also animate the back screen with
 *   `pushScreenBehind` from `@/lib/motion`.
 * - Edge-swipe-back: drag from the left ~`edgeWidth` px to drag the screen
 *   back. Release past 35% width or a >500 px/s flick confirms; otherwise
 *   it springs back to 0. Velocity is handed off to the closing spring.
 * - Edge-swipe is gated on `display-mode: standalone` to avoid conflicting
 *   with Safari's own back gesture.
 * - Respects prefers-reduced-motion (cross-fade only, no slide).
 */
export const PushScreen = forwardRef<HTMLDivElement, PushScreenProps>(
  function PushScreen(
    {
      children,
      onBack,
      disableEdgeSwipe = false,
      edgeWidth = 20,
      className,
      overlayClassName,
      ...rest
    },
    ref,
  ) {
    const reduced = useReducedMotion();
    const standalone = useIsStandalone();
    const gestureActive = !reduced && !disableEdgeSwipe && standalone;

    const x = useMotionValue(0);
    // Width is read lazily on first drag; default to 1 to avoid divide-by-0.
    const widthRef = useRef(1);
    const draggingRef = useRef(false);
    const overlayOpacity = useTransform(x, (latest) => {
      const w = widthRef.current || 1;
      const progress = Math.min(1, Math.max(0, latest / w));
      return 0.18 * (1 - progress);
    });

    // Track viewport width for gesture math.
    useEffect(() => {
      const update = () => {
        widthRef.current = window.innerWidth || 1;
      };
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!gestureActive) return;
        // Only start when the touch begins within the left edge zone.
        const startX = e.clientX;
        if (startX > edgeWidth) return;
        draggingRef.current = true;
      },
      [gestureActive, edgeWidth],
    );

    const handlePan = useCallback(
      (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
        if (!draggingRef.current) return;
        // Only react to rightward drag from the edge.
        const next = Math.max(0, info.offset.x);
        x.set(next);
      },
      [x],
    );

    const handlePanEnd = useCallback(
      (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        const w = widthRef.current || 1;
        const progress = info.offset.x / w;
        const flickRight = info.velocity.x > 500;
        const confirmBack = progress > 0.35 || flickRight;
        if (confirmBack) {
          // Velocity handoff: pass release velocity to the closing spring.
          animate(x, w, {
            ...spring.smooth,
            velocity: info.velocity.x,
          });
          // Schedule onBack after the slide-out completes.
          window.setTimeout(onBack, 280);
        } else {
          animate(x, 0, spring.smooth);
        }
      },
      [onBack, x],
    );

    if (reduced) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0 }}
          className={
            className ??
            "fixed inset-0 z-[9000] overflow-y-auto bg-background text-foreground"
          }
          {...rest}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <>
        {/* Dim overlay that fakes the back-screen recede. */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          exit={{ opacity: 0 }}
          transition={spring.smooth}
          style={{ opacity: gestureActive ? overlayOpacity : undefined }}
          className={
            overlayClassName ??
            "pointer-events-none fixed inset-0 z-[8999] bg-black"
          }
        />
        <motion.div
          ref={ref}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={spring.smooth}
          style={gestureActive ? { x } : undefined}
          onPointerDown={handlePointerDown}
          onPan={gestureActive ? handlePan : undefined}
          onPanEnd={gestureActive ? handlePanEnd : undefined}
          className={
            className ??
            "fixed inset-0 z-[9000] overflow-y-auto bg-background text-foreground"
          }
          {...rest}
        >
          {/* Invisible edge gesture target so left-edge drags initiate even
              when the page content is interactive. */}
          {gestureActive && (
            <div
              aria-hidden
              className="fixed left-0 top-0 z-[9001] h-full"
              style={{ width: edgeWidth, touchAction: "pan-y" }}
            />
          )}
          {children}
        </motion.div>
      </>
    );
  },
);
