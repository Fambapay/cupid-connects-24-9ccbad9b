import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { spring } from "@/lib/motion";
import { useCardRise } from "./useCardRise";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  /** Optional class for the sheet panel itself. */
  className?: string;
  /** Optional class for the backdrop. */
  backdropClassName?: string;
  /** Extra props forwarded to the sheet motion.div. */
  motionProps?: Omit<HTMLMotionProps<"div">, "children">;
  /** When true (default), the page behind scales down + rounds corners. */
  cardRise?: boolean;
  /** Selector for the element to apply the card-rise transform to (default `#hunie-app-root`). */
  cardRiseTarget?: string;
}

/**
 * Sheet — iOS-style bottom sheet:
 * - Slides up with `spring.sheet`
 * - Backdrop fades in
 * - Closes via swipe-down or backdrop tap
 * - When open, the container behind scales to 0.94 with rounded corners (the
 *   "card rise") via a body class hook (`.hunie-sheet-open`).
 * - Respects prefers-reduced-motion.
 */
export function Sheet({
  open,
  onClose,
  children,
  className,
  backdropClassName,
  motionProps,
  cardRise = true,
  cardRiseTarget = "#hunie-app-root",
}: SheetProps) {
  const reduced = useReducedMotion();

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Card-rise on the page behind.
  useCardRise(open && cardRise, cardRiseTarget);


  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            onClick={onClose}
            className={
              backdropClassName ??
              "fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm"
            }
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={reduced ? { y: 0 } : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduced ? { y: 0, opacity: 0 } : { y: "100%" }}
            transition={reduced ? { duration: 0 } : spring.sheet}
            drag={reduced ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className={
              className ??
              "fixed inset-x-0 bottom-0 z-[10001] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background p-5 pb-[max(env(safe-area-inset-bottom),24px)] text-foreground shadow-2xl"
            }
            {...motionProps}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/15" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
