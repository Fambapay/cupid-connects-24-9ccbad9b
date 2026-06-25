import { isNative } from './platform'

export interface GeoPosition {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number | null
  altitudeAccuracy?: number | null
  heading?: number | null
  speed?: number | null
}

export interface GeoError {
  code: number
  message: string
}

function toGeoPosition(p: any): GeoPosition {
  const c = p.coords ?? p
  return {
    latitude: c.latitude ?? 0,
    longitude: c.longitude ?? 0,
    accuracy: c.accuracy,
    altitude: c.altitude ?? null,
    altitudeAccuracy: c.altitudeAccuracy ?? null,
    heading: c.heading ?? null,
    speed: c.speed ?? null,
  }
}

/**
 * Obtém a localização atual do utilizador.
 * Usa o plugin nativo do Capacitor quando disponível; fallback para Web Geolocation API.
 */
export async function getCurrentPosition(
  options: { enableHighAccuracy?: boolean; timeout?: number } = {}
): Promise<GeoPosition> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 10000,
    })
    return toGeoPosition(pos)
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: 0, message: 'Geolocation not supported' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toGeoPosition(pos)),
      (err) => reject({ code: err.code, message: err.message }),
      { enableHighAccuracy: options.enableHighAccuracy ?? true, timeout: options.timeout ?? 10000 }
    )
  })
}

/**
 * Monitora alterações na localização do utilizador.
 * Usa o plugin nativo do Capacitor quando disponível; fallback para Web Geolocation API.
 */
export async function watchPosition(
  callback: (pos: GeoPosition) => void,
  options: { enableHighAccuracy?: boolean; timeout?: number } = {}
): Promise<() => void> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const watcher = await Geolocation.watchPosition(
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
      },
      (pos, err) => {
        if (err) return
        if (pos) callback(toGeoPosition(pos))
      }
    )
    return () => {
      Geolocation.clearWatch({ id: watcher })
    }
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => callback(toGeoPosition(pos)),
    () => {},
    { enableHighAccuracy: options.enableHighAccuracy ?? true, timeout: options.timeout ?? 10000 }
  )
  return () => navigator.geolocation.clearWatch(id)
}

/**
 * Solicita permissão de localização (nativo).
 * No web, retorna 'granted' se o browser suportar Permissions API.
 */
export async function requestLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const result = await Geolocation.requestPermissions()
    return (result.location as 'granted' | 'denied' | 'prompt') ?? 'prompt'
  }

  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as any })
      return status.state as 'granted' | 'denied' | 'prompt'
    } catch {
      // ignore
    }
  }
  return 'prompt'
}

/**
 * Verifica o estado atual da permissão de localização.
 */
export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const result = await Geolocation.checkPermissions()
    return (result.location as 'granted' | 'denied' | 'prompt') ?? 'prompt'
  }

  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as any })
      return status.state as 'granted' | 'denied' | 'prompt'
    } catch {
      // ignore
    }
  }
  return 'prompt'
}
