import { useEffect, useState, useCallback } from "react";

export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export function useGeolocation(autoRequest: boolean = false) {
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const queryPermission = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    try {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      setPermissionState(status.state as PermissionState);
      status.onchange = () => setPermissionState(status.state as PermissionState);
    } catch { /* noop */ }
  }, []);

  useEffect(() => { queryPermission(); }, [queryPermission]);

  const requestPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermissionState("granted");
        setLoading(false);
      },
      () => {
        setPermissionState("denied");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (autoRequest) requestPermission();
  }, [autoRequest, requestPermission]);

  return { permissionState, loading, coords, requestPermission };
}
