import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { stagger } from "@/lib/motion";

export interface StaggerProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
  /** Delay between children in seconds (default 0.04). */
  stagger?: number;
}

/**
 * Stagger — container that reveals children in cascade.
 * Pair with <StaggerItem> for each child. Respects prefers-reduced-motion.
 */
export const Stagger = forwardRef<HTMLDivElement, StaggerProps>(
  function Stagger({ children, stagger: staggerChildren = 0.04, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        initial="initial"
        animate="animate"
        variants={{
          animate: {
            transition: { staggerChildren: reduced ? 0 : staggerChildren },
          },
        }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);

export interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: ReactNode;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  function StaggerItem({ children, ...rest }, ref) {
    const reduced = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        variants={
          reduced
            ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
            : stagger.item
        }
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
