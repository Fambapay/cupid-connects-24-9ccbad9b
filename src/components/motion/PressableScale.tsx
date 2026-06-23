import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { spring } from "@/lib/motion";

export interface PressableScaleProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
  /** Override target scale on tap (default 0.96). */
  scale?: number;
}

/**
 * PressableScale — wraps content in a motion.div that scales down on press
 * with the iOS-like `spring.micro`. Respects prefers-reduced-motion.
 */
export const PressableScale = forwardRef<HTMLDivElement, PressableScaleProps>(
  function PressableScale({ children, scale = 0.96, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        whileTap={reduced ? undefined : { scale }}
        transition={spring.micro}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
