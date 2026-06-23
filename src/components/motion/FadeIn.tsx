import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { spring } from "@/lib/motion";

export interface FadeInProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
  /** Vertical offset to slide from (default 8px). */
  y?: number;
  /** Optional delay in seconds. */
  delay?: number;
}

/**
 * FadeIn — fades + slides up slightly on mount using `spring.snappy`.
 * Respects prefers-reduced-motion (falls back to instant reveal).
 */
export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  function FadeIn({ children, y = 8, delay, ...rest }, ref) {
    const reduced = useReducedMotion();
    if (reduced) {
      return (
        <motion.div ref={ref} {...rest}>
          {children}
        </motion.div>
      );
    }
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.snappy, delay }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
