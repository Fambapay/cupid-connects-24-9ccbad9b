import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";

export interface RouteTransitionProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
}

/**
 * RouteTransition — fast cross-fade between routes/tabs. Place inside an
 * <AnimatePresence> keyed by `location.pathname` (or tab id). No vertical
 * or horizontal motion: switching tabs on iOS only fades. Reduced motion
 * collapses to instant swap.
 */
export const RouteTransition = forwardRef<HTMLDivElement, RouteTransitionProps>(
  function RouteTransition({ children, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        initial={reduced ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.12, ease: [0.32, 0.72, 0, 1] }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
