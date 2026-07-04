import { useCallback, useEffect, useState } from "react";

export interface GeoCoords {
  lat: number;
  lng: number;
}

export type GeoPermissionState = "prompt" | "granted" | "denied" | "unsupported" | "unknown";

interface UseGeolocationReturn {
  coords: GeoCoords | null;
  error: string | null;
  loading: boolean;
  requested: boolean;
  permissionState: GeoPermissionState;
  requestPermission: () => Promise<GeoCoords | null>;
}

/**
 * Requests the browser's current position. When `auto` is true, tries once on
 * mount (best-effort — no toast, silent failure). Also exposes an explicit
 * `requestPermission()` for settings-style opt-in UIs.
 * Safe in SSR (no-op when `navigator` is absent).
 */
export function useGeolocation(auto = true): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [permissionState, setPermissionState] = useState<GeoPermissionState>("unknown");

  // Query Permissions API where available (Chromium/Firefox).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      return;
    }
    const perms = (navigator as Navigator & {
      permissions?: { query: (d: { name: PermissionName }) => Promise<PermissionStatus> };
    }).permissions;
    if (!perms?.query) {
      setPermissionState("prompt");
      return;
    }
    let status: PermissionStatus | null = null;
    perms
      .query({ name: "geolocation" as PermissionName })
      .then((s) => {
        status = s;
        setPermissionState(s.state as GeoPermissionState);
        s.onchange = () => setPermissionState(s.state as GeoPermissionState);
      })
      .catch(() => setPermissionState("prompt"));
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<GeoCoords | null> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("unsupported");
      setPermissionState("unsupported");
      return null;
    }
    setRequested(true);
    setLoading(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setPermissionState("granted");
          setLoading(false);
          resolve(c);
        },
        (err) => {
          const denied = err.code === err.PERMISSION_DENIED;
          setError(denied ? "denied" : "unavailable");
          if (denied) setPermissionState("denied");
          setLoading(false);
          resolve(null);
        },
        { maximumAge: 5 * 60 * 1000, timeout: 10_000, enableHighAccuracy: false },
      );
    });
  }, []);

  // Best-effort auto-request. Only when caller opts in AND permission is already
  // granted or in prompt state (avoid re-asking users who denied).
  useEffect(() => {
    if (!auto) return;
    if (permissionState === "denied" || permissionState === "unsupported") return;
    if (requested || coords) return;
    void requestPermission();
  }, [auto, permissionState, requested, coords, requestPermission]);

  return { coords, error, loading, requested, permissionState, requestPermission };
}
