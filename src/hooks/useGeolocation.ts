import { useEffect, useState } from "react";

export interface GeoCoords {
  lat: number;
  lng: number;
}

/**
 * Requests the browser's current position once on mount. Returns cached coords
 * for up to 5 min. Safe in SSR (no-op when `navigator` is absent).
 * Passing the fresh coords to the discovery feed avoids showing stale results
 * for users who have moved since editing their profile location.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("unsupported");
      return;
    }
    setRequested(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { maximumAge: 5 * 60 * 1000, timeout: 10_000, enableHighAccuracy: false },
    );
  }, []);

  return { coords, error, requested };
}
