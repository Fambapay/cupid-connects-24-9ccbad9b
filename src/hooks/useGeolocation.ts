import { useEffect, useState, useCallback } from "react";
import {
  getCurrentPosition,
  checkLocationPermission,
  requestLocationPermission,
  type GeoPosition,
} from "@/lib/native/geolocation";

export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export function useGeolocation(autoRequest: boolean = false) {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const queryPermission = useCallback(async () => {
    try {
      const state = await checkLocationPermission();
      setPermissionState(state as PermissionState);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { queryPermission(); }, [queryPermission]);

  const requestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const state = await requestLocationPermission();
      setPermissionState(state as PermissionState);
      if (state === "granted") {
        const pos = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        setCoords({ lat: pos.latitude, lng: pos.longitude });
      }
    } catch {
      setPermissionState("denied");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoRequest) requestPermission();
  }, [autoRequest, requestPermission]);

  return { permissionState, loading, coords, requestPermission };
}
