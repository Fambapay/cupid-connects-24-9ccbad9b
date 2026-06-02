/**
 * Spring physics presets for framer-motion transitions.
 * Use these instead of `ease: 'linear'` or generic durations for native-feel motion.
 */

export const spring = {
  gentle: { type: 'spring', stiffness: 200, damping: 28, mass: 0.8 },
  snappy: { type: 'spring', stiffness: 400, damping: 30, mass: 0.7 },
  bouncy: { type: 'spring', stiffness: 380, damping: 22, mass: 1.0 },
  stiff: { type: 'spring', stiffness: 500, damping: 35, mass: 0.6 },
} as const;

/** Page-level transition presets. */
type PageVariant = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
  transition: { duration: number; ease: string | number[] };
};

export const pageTransitions: Record<'slide' | 'slideBack' | 'fade', PageVariant> = {
  slide: {
    initial: { opacity: 1, x: '100%' },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0.5, x: '-30%' },
    transition: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
  },
  slideBack: {
    initial: { opacity: 0.5, x: '-30%' },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 1, x: '100%' },
    transition: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
  },
  fade: {
    initial: { opacity: 0, scale: 0.99 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.995 },
    transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
  },
};

/**
 * iOS-style modal/sheet presentation. Use as `initial/animate/exit` on a
 * full-screen overlay container. Pair with `useShellPresenting()` to
 * shrink the shell behind it.
 */
export const sheetPresentation = {
  initial: { y: '100%', opacity: 1 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 1 },
  transition: { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 },
} as const;