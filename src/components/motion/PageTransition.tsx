import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { spring } from "@/lib/motion";

export interface PageTransitionProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
  /** Stable key per route — pair with <AnimatePresence mode="wait">. */
  routeKey?: string;
}

/**
 * PageTransition — wrap a route subtree to fade/slide between routes using
 * `spring.smooth`. Respects prefers-reduced-motion.
 */
export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
  function PageTransition({ children, routeKey, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        key={routeKey}
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={reduced ? { duration: 0 } : spring.smooth}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
