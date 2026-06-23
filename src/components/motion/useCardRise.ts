import { useEffect } from "react";

const STYLE_ID = "hunie-sheet-card-rise";

/**
 * Apply iOS-style "card rise": when `open` is true, the element matching
 * `target` scales down to 0.94, rounds its corners and the body gets a
 * `.hunie-sheet-open` class. The CSS is injected once and respects
 * prefers-reduced-motion.
 *
 * Default target is `#hunie-app-root` — the AppShell root carries that id.
 */
export function useCardRise(open: boolean, target: string = "#hunie-app-root") {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        body.hunie-sheet-open ${target} {
          transform: scale(0.94);
          border-radius: 24px;
          overflow: hidden;
          transform-origin: 50% 0%;
          transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1),
                      border-radius 0.5s cubic-bezier(0.32, 0.72, 0, 1);
          will-change: transform, border-radius;
        }
        @media (prefers-reduced-motion: reduce) {
          body.hunie-sheet-open ${target} {
            transform: none;
            border-radius: 0;
            transition: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const body = document.body;
    body.classList.add("hunie-sheet-open");
    return () => {
      body.classList.remove("hunie-sheet-open");
    };
  }, [open, target]);
}
