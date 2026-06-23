import { useEffect } from "react";

/**
 * Theme follows the OS preference (prefers-color-scheme).
 * - System dark → <html> has class "dark"
 * - System light → <html> has class "light"
 *
 * Some routes (e.g. Discovery) want to stay dark regardless of system theme.
 * Use `useForceDarkTheme()` in those routes.
 */

type Mode = "dark" | "light";

function getSystemMode(): Mode {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyMode(mode: Mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.classList.toggle("light", mode === "light");
}

// Tracks how many mounted screens are requesting a forced dark theme.
let forceDarkCount = 0;

export function useSystemTheme() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      if (forceDarkCount > 0) {
        applyMode("dark");
      } else {
        applyMode(mql.matches ? "dark" : "light");
      }
    };
    sync();
    mql.addEventListener?.("change", sync);
    return () => mql.removeEventListener?.("change", sync);
  }, []);
}

export function useForceDarkTheme() {
  useEffect(() => {
    forceDarkCount++;
    applyMode("dark");
    return () => {
      forceDarkCount = Math.max(0, forceDarkCount - 1);
      if (forceDarkCount === 0) {
        applyMode(getSystemMode());
      }
    };
  }, []);
}
