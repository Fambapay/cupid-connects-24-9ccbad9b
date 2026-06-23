// Springs que espelham as named springs do iOS / SwiftUI — o "Apple feel".
export const spring = {
  smooth: { type: "spring", visualDuration: 0.45, bounce: 0 },
  snappy: { type: "spring", visualDuration: 0.4,  bounce: 0.18 },
  bouncy: { type: "spring", visualDuration: 0.5,  bounce: 0.32 },
  micro:  { type: "spring", visualDuration: 0.18, bounce: 0.15 },
  sheet:  { type: "spring", visualDuration: 0.5,  bounce: 0.12 },
} as const;

export const fade = {
  initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
};

export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: spring.snappy },
  },
};
