import { useEffect } from "react";

/**
 * Light mode is temporarily disabled — the app is locked to dark theme.
 * All pages render in dark mode regardless of OS preference.
 */

function applyDark() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("dark");
  root.classList.remove("light");
}

export function useSystemTheme() {
  useEffect(() => {
    applyDark();
  }, []);
}

export function useForceDarkTheme() {
  useEffect(() => {
    applyDark();
  }, []);
}
